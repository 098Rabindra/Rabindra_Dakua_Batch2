package com.infosys.vault.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.security.SecureRandom;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;
import java.util.logging.Logger;

@Service
@SuppressWarnings("null")
public class OtpService {

    private static final Logger LOGGER = Logger.getLogger(OtpService.class.getName());
    private static final long OTP_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

    private final JavaMailSender mailSender;
    private final Map<String, OtpData> otpCache = new ConcurrentHashMap<>();
    private final Map<String, String> lastOtpMap = new ConcurrentHashMap<>();
    private final Set<String> verifiedEmails = ConcurrentHashMap.newKeySet();
    private final SecureRandom random = new SecureRandom();

    @Value("${spring.mail.username:drajapreinsta@gmail.com}")
    private String mailFrom;

    public OtpService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    private static class OtpData {
        final String code;
        final long expiryTime;

        OtpData(String code, long expiryTime) {
            this.code = code;
            this.expiryTime = expiryTime;
        }
    }

    public String generateAndSendOtp(String email) {
        return generateAndSendOtpWithSubject(email, "Your Registration OTP - Password Vault", "Account Email Verification", "complete your vault account registration");
    }

    public String generateAndSendResetOtp(String email) {
        return generateAndSendOtpWithSubject(email, "Password Reset OTP - Password Vault", "Password Reset Verification", "reset your master password");
    }

    private String generateAndSendOtpWithSubject(String email, String subject, String headerSubtitle, String actionText) {
        String cleanEmail = email.trim().toLowerCase();
        String code = String.format("%06d", random.nextInt(1000000));
        long expiry = System.currentTimeMillis() + OTP_EXPIRATION_MS;

        otpCache.put(cleanEmail, new OtpData(code, expiry));
        lastOtpMap.put(cleanEmail, code);

        System.out.println("==================================================");
        System.out.println(">>> GENERATED OTP FOR [" + cleanEmail + "]: " + code + " <<<");
        System.out.println("==================================================");

        // Send email asynchronously so API responds immediately without blocking on SMTP socket timeouts
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                sendOtpEmail(cleanEmail, code, subject, headerSubtitle, actionText);
            } catch (MessagingException | UnsupportedEncodingException | MailException e) {
                LOGGER.log(Level.WARNING, "SMTP delivery issue: {0}. OTP code saved and available via console: {1}", new Object[]{e.getMessage(), code});
            }
        });

        return code;
    }

    public boolean verifyOtp(String email, String code) {
        String cleanEmail = email.trim().toLowerCase();
        OtpData data = otpCache.get(cleanEmail);

        if (data == null) {
            throw new RuntimeException("No OTP requested for this email or OTP expired. Please request a new OTP.");
        }

        if (System.currentTimeMillis() > data.expiryTime) {
            otpCache.remove(cleanEmail);
            throw new RuntimeException("OTP has expired. Please request a new OTP.");
        }

        if (!data.code.equals(code.trim())) {
            throw new RuntimeException("Invalid OTP code. Please check and try again.");
        }

        // OTP Validated successfully
        otpCache.remove(cleanEmail);
        verifiedEmails.add(cleanEmail);
        return true;
    }

    public String getLastOtp(String email) {
        return lastOtpMap.get(email.trim().toLowerCase());
    }

    public boolean isEmailVerified(String email) {
        return verifiedEmails.contains(email.trim().toLowerCase());
    }

    public void clearVerification(String email) {
        verifiedEmails.remove(email.trim().toLowerCase());
    }

    private void sendOtpEmail(String recipientEmail, String otpCode, String subject, String headerSubtitle, String actionText) throws MessagingException, UnsupportedEncodingException, MailException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(mailFrom, "Password Vault Security");
        helper.setTo(recipientEmail);
        helper.setSubject(subject);

        String htmlContent = "<div style=\"font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background-color: #0f172a; border-radius: 16px; color: #f1f5f9; border: 1px solid #334155;\">"
                + "<div style=\"text-align: center; margin-bottom: 20px;\">"
                + "<h2 style=\"color: #818cf8; margin: 0; font-size: 24px; font-weight: 800;\">PASSWORD <span style=\"color: #38bdf8;\">VAULT</span></h2>"
                + "<p style=\"color: #94a3b8; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;\">" + headerSubtitle + "</p>"
                + "</div>"
                + "<div style=\"background: #1e293b; padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #475569;\">"
                + "<p style=\"color: #cbd5e1; font-size: 14px; margin-top: 0;\">Use the following One-Time Password (OTP) to " + actionText + ":</p>"
                + "<div style=\"font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #38bdf8; padding: 12px; background: #0f172a; border-radius: 8px; margin: 16px 0; border: 1px dashed #6366f1;\">"
                + otpCode
                + "</div>"
                + "<p style=\"color: #94a3b8; font-size: 12px; margin-bottom: 0;\">This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>"
                + "</div>"
                + "<div style=\"text-align: center; margin-top: 20px; color: #64748b; font-size: 11px;\">"
                + "<p style=\"margin: 0;\">Zero-Knowledge Password Vault • End-to-End Encryption</p>"
                + "</div>"
                + "</div>";

        helper.setText(htmlContent, true);
        mailSender.send(message);
        LOGGER.log(Level.INFO, "OTP Email successfully delivered to: {0}", recipientEmail);
    }

    public boolean sendShareNotificationEmail(com.infosys.vault.dto.ShareEmailRequest request) {
        String cleanEmail = request.getRecipientEmail().trim().toLowerCase();
        String title = (request.getItemTitle() != null && !request.getItemTitle().trim().isEmpty())
                ? request.getItemTitle().trim()
                : "Secure Credential";
        String link = request.getShareLink();
        String exp = (request.getExpiration() != null && !request.getExpiration().trim().isEmpty())
                ? request.getExpiration()
                : "24h";

        String sender = (request.getSenderEmail() != null && !request.getSenderEmail().trim().isEmpty())
                ? request.getSenderEmail().trim()
                : "Vault User";

        String rawPerm = request.getPermissionLevel() != null ? request.getPermissionLevel() : "VIEW_ONLY";
        String permLabel = "View Only";
        if ("EDIT_ACCESS".equalsIgnoreCase(rawPerm)) {
            permLabel = "Edit Access";
        } else if ("FULL_MANAGEMENT".equalsIgnoreCase(rawPerm)) {
            permLabel = "Full Management";
        }

        String passcode = (request.getPasscode() != null) ? request.getPasscode().trim() : "";

        System.out.println("==================================================");
        System.out.println(">>> SENDING SHARE LINK EMAIL TO [" + cleanEmail + "] FOR ITEM [" + title + "] (Passcode: " + (passcode.isEmpty() ? "None" : passcode) + ") <<<");
        System.out.println("==================================================");

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(mailFrom, "Password Vault Security");
            helper.setTo(cleanEmail);
            helper.setSubject("Secure Credential Shared with You: " + title);

            String passcodeHtml = "";
            if (!passcode.isEmpty()) {
                passcodeHtml = "<div style=\"margin: 16px 0; padding: 14px; background: #0f172a; border-radius: 10px; border: 1px solid #f59e0b; text-align: center;\">"
                        + "<span style=\"color: #fbbf24; font-size: 11px; font-weight: 800; uppercase; tracking-wider: 1px; display: block; margin-bottom: 4px;\">🔑 SECURITY ACCESS PIN / PASSCODE</span>"
                        + "<span style=\"color: #ffffff; font-family: monospace; font-size: 22px; font-weight: 800; letter-spacing: 4px;\">" + passcode + "</span>"
                        + "<p style=\"color: #94a3b8; font-size: 11px; margin: 4px 0 0 0;\">Enter this PIN when opening the secure share link.</p>"
                        + "</div>";
            }

            String htmlContent = "<div style=\"font-family: 'Segoe UI', Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px; background-color: #0b1329; border-radius: 16px; color: #f1f5f9; border: 1px solid #1e293b;\">"
                    + "<div style=\"text-align: center; margin-bottom: 24px;\">"
                    + "<h2 style=\"color: #818cf8; margin: 0; font-size: 24px; font-weight: 800;\">PASSWORD <span style=\"color: #38bdf8;\">VAULT</span></h2>"
                    + "<p style=\"color: #34d399; font-size: 11px; margin-top: 6px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;\">🔐 ZERO-KNOWLEDGE ENCRYPTED SHARE</p>"
                    + "</div>"
                    + "<div style=\"background: #151e38; padding: 24px; border-radius: 12px; border: 1px solid #334155;\">"
                    + "<h3 style=\"color: #ffffff; font-size: 18px; margin: 0 0 8px 0; text-align: center;\">You've received a shared credential secret!</h3>"
                    + "<p style=\"color: #94a3b8; font-size: 12px; text-align: center; margin-top: 0; margin-bottom: 16px;\">Shared by: <strong style=\"color: #cbd5e1;\">" + sender + "</strong></p>"
                    + "<div style=\"background: #0f172a; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #1e293b; font-size: 13px;\">"
                    + "<div style=\"display: flex; justify-content: space-between; margin-bottom: 6px;\"><span style=\"color: #94a3b8;\">Credential Title:</span> <strong style=\"color: #38bdf8;\">" + title + "</strong></div>"
                    + "<div style=\"display: flex; justify-content: space-between; margin-bottom: 6px;\"><span style=\"color: #94a3b8;\">Permission Granted:</span> <strong style=\"color: #34d399;\">" + permLabel + "</strong></div>"
                    + "<div style=\"display: flex; justify-content: space-between;\"><span style=\"color: #94a3b8;\">Expiration:</span> <strong style=\"color: #f59e0b;\">" + exp + "</strong></div>"
                    + "</div>"
                    + passcodeHtml
                    + "<div style=\"text-align: center; margin: 24px 0;\">"
                    + "<a href=\"" + link + "\" style=\"background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(99,102,241,0.4);\">ACCESS SECURE CREDENTIAL</a>"
                    + "</div>"
                    + "<p style=\"color: #64748b; font-size: 11px; text-align: center; margin-bottom: 0; margin-top: 16px;\">If the button above does not work, copy and paste this link into your browser:<br/><span style=\"color: #818cf8; word-break: break-all;\">" + link + "</span></p>"
                    + "</div>"
                    + "<div style=\"text-align: center; margin-top: 24px; color: #475569; font-size: 11px;\">"
                    + "<p style=\"margin: 0;\">End-to-End Encrypted One-Time Sharing Package • Zero-Knowledge Architecture</p>"
                    + "</div>"
                    + "</div>";

            helper.setText(htmlContent, true);
            mailSender.send(message);
            LOGGER.log(Level.INFO, "Share Notification Email successfully sent to: {0}", cleanEmail);
            return true;
        } catch (MessagingException | UnsupportedEncodingException | MailException e) {
            LOGGER.log(Level.WARNING, "SMTP delivery issue: {0}. Shared link saved locally.", e.getMessage());
            return false;
        }
    }




}


