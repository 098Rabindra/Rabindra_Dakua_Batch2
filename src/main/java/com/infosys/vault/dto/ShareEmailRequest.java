package com.infosys.vault.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class ShareEmailRequest {

    @NotBlank(message = "Recipient email is required")
    @Email(message = "Invalid recipient email address")
    private String recipientEmail;

    @NotBlank(message = "Share link is required")
    private String shareLink;

    private String itemTitle;
    private String expiration;
    private String permissionLevel;
    private String passcode;
    private String senderEmail;

    public ShareEmailRequest() {
    }

    public ShareEmailRequest(String recipientEmail, String shareLink, String itemTitle, String expiration) {
        this.recipientEmail = recipientEmail;
        this.shareLink = shareLink;
        this.itemTitle = itemTitle;
        this.expiration = expiration;
    }

    public ShareEmailRequest(String recipientEmail, String shareLink, String itemTitle, String expiration, String permissionLevel, String passcode, String senderEmail) {
        this.recipientEmail = recipientEmail;
        this.shareLink = shareLink;
        this.itemTitle = itemTitle;
        this.expiration = expiration;
        this.permissionLevel = permissionLevel;
        this.passcode = passcode;
        this.senderEmail = senderEmail;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public void setRecipientEmail(String recipientEmail) {
        this.recipientEmail = recipientEmail;
    }

    public String getShareLink() {
        return shareLink;
    }

    public void setShareLink(String shareLink) {
        this.shareLink = shareLink;
    }

    public String getItemTitle() {
        return itemTitle;
    }

    public void setItemTitle(String itemTitle) {
        this.itemTitle = itemTitle;
    }

    public String getExpiration() {
        return expiration;
    }

    public void setExpiration(String expiration) {
        this.expiration = expiration;
    }

    public String getPermissionLevel() {
        return permissionLevel;
    }

    public void setPermissionLevel(String permissionLevel) {
        this.permissionLevel = permissionLevel;
    }

    public String getPasscode() {
        return passcode;
    }

    public void setPasscode(String passcode) {
        this.passcode = passcode;
    }

    public String getSenderEmail() {
        return senderEmail;
    }

    public void setSenderEmail(String senderEmail) {
        this.senderEmail = senderEmail;
    }
}

