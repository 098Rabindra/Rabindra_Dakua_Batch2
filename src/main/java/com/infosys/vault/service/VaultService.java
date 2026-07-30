package com.infosys.vault.service;

import com.infosys.vault.dto.VaultItemRequest;
import com.infosys.vault.dto.VaultItemResponse;
import com.infosys.vault.model.Category;
import com.infosys.vault.model.User;
import com.infosys.vault.model.VaultItem;
import com.infosys.vault.repository.UserRepository;
import com.infosys.vault.repository.VaultItemRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class VaultService {

    private final VaultItemRepository vaultItemRepository;
    private final UserRepository userRepository;

    public VaultService(VaultItemRepository vaultItemRepository, UserRepository userRepository) {
        this.vaultItemRepository = vaultItemRepository;
        this.userRepository = userRepository;
    }

    public List<VaultItemResponse> getUserVaultItems(String userId, String category, Boolean favorite) {
        List<VaultItem> items;
        if (category != null && !category.isEmpty()) {
            Category cat = Category.valueOf(category.toUpperCase());
            items = vaultItemRepository.findByUserIdAndCategoryOrderByUpdatedAtDesc(userId, cat);
        } else if (Boolean.TRUE.equals(favorite)) {
            items = vaultItemRepository.findByUserIdAndFavoriteOrderByUpdatedAtDesc(userId, true);
        } else {
            items = vaultItemRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        }

        return items.stream().map(VaultItemResponse::new).collect(Collectors.toList());
    }

    public VaultItemResponse getVaultItemById(String id, String userId) {
        VaultItem item = vaultItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Vault item not found"));
        return new VaultItemResponse(item);
    }

    public VaultItemResponse createVaultItem(VaultItemRequest request, String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

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

        VaultItem saved = vaultItemRepository.save(item);
        return new VaultItemResponse(saved);
    }

    public VaultItemResponse updateVaultItem(String id, VaultItemRequest request, String userId) {
        VaultItem item = vaultItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Vault item not found"));

        item.setTitle(request.getTitle());
        item.setUsername(request.getUsername());
        item.setEncryptedPassword(request.getEncryptedPassword());
        item.setIv(request.getIv());
        item.setUrl(request.getUrl());
        item.setCategory(request.getCategory());
        item.setFavorite(request.isFavorite());
        item.setNotes(request.getNotes());

        VaultItem saved = vaultItemRepository.save(item);
        return new VaultItemResponse(saved);
    }

    public void deleteVaultItem(String id, String userId) {
        VaultItem item = vaultItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Vault item not found"));
        vaultItemRepository.delete(item);
    }

    public VaultItemResponse toggleFavorite(String id, String userId) {
        VaultItem item = vaultItemRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Vault item not found"));
        item.setFavorite(!item.isFavorite());
        VaultItem saved = vaultItemRepository.save(item);
        return new VaultItemResponse(saved);
    }
}
