package com.infosys.vault.dto;

public class AuthResponse {
    private String token;
    private String type = "Bearer";
    private String id;
    private String username;
    private String email;
    private String userSalt;

    public AuthResponse(String token, String id, String username, String email, String userSalt) {
        this.token = token;
        this.id = id;
        this.username = username;
        this.email = email;
        this.userSalt = userSalt;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getUserSalt() {
        return userSalt;
    }

    public void setUserSalt(String userSalt) {
        this.userSalt = userSalt;
    }
}
