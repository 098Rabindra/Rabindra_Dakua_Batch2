package com.infosys.vault.service;

import com.infosys.vault.dto.AuthResponse;
import com.infosys.vault.dto.LoginRequest;
import com.infosys.vault.dto.RegisterRequest;
import com.infosys.vault.model.User;
import com.infosys.vault.repository.UserRepository;
import com.infosys.vault.security.JwtUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Base64;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtils jwtUtils) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Error: Email is already in use!");
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Error: Username is already taken!");
        }

        // Generate user unique salt for key derivation
        String userSalt = generateSalt();

        User user = new User(
                request.getUsername(),
                request.getEmail(),
                passwordEncoder.encode(request.getPassword()),
                userSalt
        );

        User savedUser = userRepository.save(user);
        String token = jwtUtils.generateJwtToken(savedUser.getId(), savedUser.getUsername());

        return new AuthResponse(token, savedUser.getId(), savedUser.getUsername(), savedUser.getEmail(), savedUser.getUserSalt());
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseGet(() -> userRepository.findByUsername(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid username or password")));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Invalid username or password");
        }

        String token = jwtUtils.generateJwtToken(user.getId(), user.getUsername());
        return new AuthResponse(token, user.getId(), user.getUsername(), user.getEmail(), user.getUserSalt());
    }

    private String generateSalt() {
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        return Base64.getEncoder().encodeToString(salt);
    }
}
