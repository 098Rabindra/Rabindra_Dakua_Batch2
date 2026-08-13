package com.infosys.vault.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.infosys.vault.dto.AuthResponse;
import com.infosys.vault.dto.LoginRequest;
import com.infosys.vault.dto.RegisterRequest;
import com.infosys.vault.dto.ResetPasswordRequest;
import com.infosys.vault.model.User;
import com.infosys.vault.repository.UserRepository;
import com.infosys.vault.security.JwtUtils;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final OtpService otpService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtils jwtUtils, OtpService otpService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
        this.otpService = otpService;
    }

    public String sendRegistrationOtp(String email) {
        if (userRepository.existsByEmail(email.trim())) {
            throw new RuntimeException("Email address already exists!");
        }
        return otpService.generateAndSendOtp(email);
    }

    public String sendForgotPasswordOtp(String email) {
        userRepository.findByEmail(email.trim())
                .orElseThrow(() -> new RuntimeException("No registered account found with this email address!"));
        return otpService.generateAndSendResetOtp(email);
    }

    public void verifyRegistrationOtp(String email, String otp) {
        otpService.verifyOtp(email, otp);
    }

    public void resetPassword(ResetPasswordRequest request) {
        // Verify OTP first
        otpService.verifyOtp(request.getEmail(), request.getOtp());

        User user = userRepository.findByEmail(request.getEmail().trim())
                .orElseThrow(() -> new RuntimeException("User account not found!"));

        // Check if new password matches old password
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Old password and new password cannot be the same. Please choose a different password.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        otpService.clearVerification(request.getEmail());
    }

    public AuthResponse register(RegisterRequest request) {
        if (!otpService.isEmailVerified(request.getEmail())) {
            throw new RuntimeException("Email address has not been verified via OTP!");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email address already exists!");
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists!");
        }

        User user = new User(
                request.getFullName(),
                request.getUsername(),
                request.getEmail(),
                passwordEncoder.encode(request.getPassword())
        );

        User savedUser = userRepository.save(user);
        otpService.clearVerification(request.getEmail());

        String token = jwtUtils.generateJwtToken(savedUser.getId(), savedUser.getUsername());

        return new AuthResponse(token, savedUser.getId(), savedUser.getFullName(), savedUser.getUsername(), savedUser.getEmail());
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseGet(() -> userRepository.findByUsername(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid username or password")));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Invalid username or password");
        }

        String token = jwtUtils.generateJwtToken(user.getId(), user.getUsername());
        return new AuthResponse(token, user.getId(), user.getFullName(), user.getUsername(), user.getEmail());
    }
}
