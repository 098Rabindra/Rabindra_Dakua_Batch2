package com.infosys.vault.service;

import com.infosys.vault.dto.AuthResponse;
import com.infosys.vault.dto.LoginLogResponse;
import com.infosys.vault.dto.LoginRequest;
import com.infosys.vault.dto.RegisterRequest;
import com.infosys.vault.dto.ResetPasswordRequest;
import com.infosys.vault.model.LoginSecurity;
import com.infosys.vault.model.User;
import com.infosys.vault.repository.LoginSecurityRepository;
import com.infosys.vault.repository.UserRepository;
import com.infosys.vault.security.JwtUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final OtpService otpService;
    private final LoginSecurityRepository loginSecurityRepository;
    private final SecurityLogService securityLogService;
    private final SecurityAuditService securityAuditService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtils jwtUtils, OtpService otpService, LoginSecurityRepository loginSecurityRepository, SecurityLogService securityLogService, SecurityAuditService securityAuditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
        this.otpService = otpService;
        this.loginSecurityRepository = loginSecurityRepository;
        this.securityLogService = securityLogService;
        this.securityAuditService = securityAuditService;
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

        securityLogService.recordSecurityLog(user.getEmail(), "SUCCESS", "Password Reset Successfully");
        securityAuditService.recordAuditLog(user.getId(), user.getEmail(), "Password Reset", "Password reset completed for " + user.getEmail());
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
        securityLogService.recordSecurityLog(savedUser.getEmail(), "SUCCESS", "Account Registered & Logged In");
        securityAuditService.recordAuditLog(savedUser.getId(), savedUser.getEmail(), "User Registered", "Account registered & logged in: " + savedUser.getEmail());
        otpService.clearVerification(request.getEmail());

        String token = jwtUtils.generateJwtToken(savedUser.getId(), savedUser.getUsername());

        return new AuthResponse(token, savedUser.getId(), savedUser.getFullName(), savedUser.getUsername(), savedUser.getEmail());
    }

    public AuthResponse login(LoginRequest request) {
        String inputIdentifier = request.getEmail() != null ? request.getEmail().trim() : "";
        User user = userRepository.findByEmail(inputIdentifier)
                .orElseGet(() -> userRepository.findByUsername(inputIdentifier).orElse(null));

        if (user == null) {
            securityLogService.recordSecurityLog(inputIdentifier, "FAILED", "Failed Login - User Not Found");
            securityAuditService.recordAuditLog(null, inputIdentifier, "Login Failed", "Failed Login - User Not Found (" + inputIdentifier + ")");
            securityAuditService.evaluateAndDetectSuspiciousActivity(inputIdentifier, null);
            throw new RuntimeException("Invalid username or password");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            securityLogService.recordSecurityLog(user.getEmail(), "FAILED", "Failed Login - Invalid Password");
            securityAuditService.recordAuditLog(user.getId(), user.getEmail(), "Login Failed", "Failed Login - Invalid Password for " + user.getEmail());
            securityAuditService.evaluateAndDetectSuspiciousActivity(user.getEmail(), user.getId());
            throw new RuntimeException("Invalid username or password");
        }

        securityLogService.recordSecurityLog(user.getEmail(), "SUCCESS", "Successful Login");
        securityAuditService.recordAuditLog(user.getId(), user.getEmail(), "Login Success", "User successfully authenticated: " + user.getEmail());

        String token = jwtUtils.generateJwtToken(user.getId(), user.getUsername());
        return new AuthResponse(token, user.getId(), user.getFullName(), user.getUsername(), user.getEmail());
    }

    public List<LoginLogResponse> getSecurityLogs(String userIdStr) {
        List<LoginSecurity> logs;
        try {
            long userId = Long.parseLong(userIdStr);
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                logs = loginSecurityRepository.findByEmailIgnoreCaseOrEmailIgnoreCaseOrderByTimestampDesc(user.getEmail(), user.getUsername());
            } else {
                logs = loginSecurityRepository.findByEmailIgnoreCaseOrderByTimestampDesc(userIdStr);
            }
        } catch (NumberFormatException e) {
            logs = loginSecurityRepository.findByEmailIgnoreCaseOrderByTimestampDesc(userIdStr);
        }

        List<LoginLogResponse> responses = new ArrayList<>();
        if (logs != null) {
            int slNo = 1;
            for (LoginSecurity sec : logs) {
                if (sec != null) {
                    responses.add(new LoginLogResponse(sec, slNo++));
                }
            }
        }
        return responses;
    }

    @org.springframework.transaction.annotation.Transactional
    public void clearSecurityLogs(String userIdStr) {
        try {
            long userId = Long.parseLong(userIdStr);
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                List<LoginSecurity> logs = loginSecurityRepository.findByEmailIgnoreCaseOrEmailIgnoreCaseOrderByTimestampDesc(user.getEmail(), user.getUsername());
                if (logs != null && !logs.isEmpty()) {
                    loginSecurityRepository.deleteAll(logs);
                }
            }
        } catch (NumberFormatException e) {
            throw new RuntimeException("Invalid user ID: " + userIdStr, e);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Failed to clear security activity logs: " + e.getMessage(), e);
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteSecurityLog(String userIdStr, Long logId) {
        if (logId == null) {
            throw new RuntimeException("Log ID cannot be null");
        }
        try {
            long userId = Long.parseLong(userIdStr);
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                LoginSecurity log = loginSecurityRepository.findById(logId).orElse(null);
                if (log != null && log.getEmail() != null &&
                        (log.getEmail().equalsIgnoreCase(user.getEmail()) || log.getEmail().equalsIgnoreCase(user.getUsername()))) {
                    loginSecurityRepository.delete(log);
                } else {
                    throw new RuntimeException("Log entry not found or unauthorized to delete.");
                }
            }
        } catch (NumberFormatException e) {
            throw new RuntimeException("Invalid user ID: " + userIdStr, e);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Failed to delete security activity log: " + e.getMessage(), e);
        }
    }
}
