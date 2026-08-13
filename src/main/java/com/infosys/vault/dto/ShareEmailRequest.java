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

    public ShareEmailRequest() {
    }

    public ShareEmailRequest(String recipientEmail, String shareLink, String itemTitle, String expiration) {
        this.recipientEmail = recipientEmail;
        this.shareLink = shareLink;
        this.itemTitle = itemTitle;
        this.expiration = expiration;
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
}
