package com.infosys.vault.service;

import com.infosys.vault.dto.VaultItemRequest;
import com.infosys.vault.dto.VaultItemResponse;
import com.infosys.vault.model.Category;
import com.infosys.vault.model.PermissionLevel;
import com.infosys.vault.model.User;
import com.infosys.vault.model.VaultItem;
import com.infosys.vault.repository.UserRepository;
import com.infosys.vault.repository.VaultItemRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@SuppressWarnings("null")
public class VaultService {

    private final VaultItemRepository vaultItemRepository;
    private final UserRepository userRepository;

    public VaultService(VaultItemRepository vaultItemRepository, UserRepository userRepository) {
        this.vaultItemRepository = vaultItemRepository;
        this.userRepository = userRepository;
    }

    private Long parseUserId(String userIdStr) {
        try {
            return Long.valueOf(userIdStr);
        } catch (NumberFormatException e) {
            throw new RuntimeException("Invalid User ID format: " + userIdStr, e);
        }
    }

    private Category parseCategory(String categoryStr) {
        try {
            return Category.valueOf(categoryStr.trim().toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new RuntimeException("Invalid Category format: " + categoryStr, e);
        }
    }

    public List<VaultItemResponse> getUserVaultItems(String userIdStr, String category, Boolean favorite) {
        Long userId = parseUserId(userIdStr);
        List<VaultItem> items;
        boolean hasCategory = category != null && !category.trim().isEmpty();
        boolean isFavorite = Boolean.TRUE.equals(favorite);

        if (hasCategory && isFavorite) {
            Category cat = parseCategory(category);
            items = vaultItemRepository.findByUserIdAndCategoryAndFavoriteOrderByUpdatedAtDesc(userId, cat, true);
        } else if (hasCategory) {
            Category cat = parseCategory(category);
            items = vaultItemRepository.findByUserIdAndCategoryOrderByUpdatedAtDesc(userId, cat);
        } else if (isFavorite) {
            items = vaultItemRepository.findByUserIdAndFavoriteOrderByUpdatedAtDesc(userId, true);
        } else {
            items = vaultItemRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        }

        return items.stream().map(VaultItemResponse::new).collect(Collectors.toList());
    }

    public VaultItemResponse getVaultItemById(String id, String userIdStr) {
        Long userId = parseUserId(userIdStr);
        VaultItem item = vaultItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Vault item not found"));
        return new VaultItemResponse(item);
    }

    public VaultItemResponse createVaultItem(VaultItemRequest request, String userIdStr) {
        Long userId = parseUserId(userIdStr);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check for duplicate vault item for the user
        List<VaultItem> existingItems = vaultItemRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        String reqTitleClean = request.getTitle() != null ? request.getTitle().trim().toLowerCase() : "";
        String reqUserClean = request.getUsername() != null ? request.getUsername().trim().toLowerCase() : "";

        boolean isDuplicate = existingItems.stream().anyMatch(existing -> {
            String exTitleClean = existing.getTitle() != null ? existing.getTitle().trim().toLowerCase() : "";
            String exUserClean = existing.getUsername() != null ? existing.getUsername().trim().toLowerCase() : "";

            boolean titleMatch = exTitleClean.equals(reqTitleClean) ||
                    exTitleClean.equals(reqTitleClean + " (shared)") ||
                    exTitleClean.replace(" (shared)", "").equals(reqTitleClean.replace(" (shared)", ""));

            boolean userMatch = exUserClean.equals(reqUserClean);
            return titleMatch && userMatch;
        });

        if (isDuplicate) {
            throw new RuntimeException("Vault item already exists in your account");
        }

        VaultItem item = new VaultItem();
        item.setUser(user);
        item.setTitle(request.getTitle());
        item.setUsername(request.getUsername());
        item.setEncryptedPassword(request.getEncryptedPassword());
        item.setIv(request.getIv());
        item.setUrl(request.getUrl());
        item.setCategory(request.getCategory());
        item.setFavorite(request.isFavorite());
        item.setNotes(request.getNotes());
        if (request.getPermissionLevel() != null) {
            item.setPermissionLevel(request.getPermissionLevel());
        }

        VaultItem saved = vaultItemRepository.save(item);
        return new VaultItemResponse(saved);
    }

    public VaultItemResponse updateVaultItem(String id, VaultItemRequest request, String userIdStr) {
        Long userId = parseUserId(userIdStr);
        VaultItem item = vaultItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Vault item not found"));

        // System Permission Check: View Only cannot edit credentials
        if (item.getPermissionLevel() == PermissionLevel.VIEW_ONLY) {
            throw new RuntimeException("Permission Denied: 'View Only' access level cannot edit this credential.");
        }

        item.setTitle(request.getTitle());
        item.setUsername(request.getUsername());
        item.setEncryptedPassword(request.getEncryptedPassword());
        item.setIv(request.getIv());
        item.setUrl(request.getUrl());
        item.setCategory(request.getCategory());
        item.setFavorite(request.isFavorite());
        item.setNotes(request.getNotes());
        if (request.getPermissionLevel() != null) {
            item.setPermissionLevel(request.getPermissionLevel());
        }

        VaultItem saved = vaultItemRepository.save(item);
        return new VaultItemResponse(saved);
    }

    public void deleteVaultItem(String id, String userIdStr) {
        Long userId = parseUserId(userIdStr);
        VaultItem item = vaultItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Vault item not found"));

        vaultItemRepository.delete(item);
    }

    public VaultItemResponse toggleFavorite(String id, String userIdStr) {
        Long userId = parseUserId(userIdStr);
        VaultItem item = vaultItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Vault item not found"));
        item.setFavorite(!item.isFavorite());
        VaultItem saved = vaultItemRepository.save(item);
        return new VaultItemResponse(saved);
    }
}
