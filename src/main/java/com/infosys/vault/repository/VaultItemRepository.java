package com.infosys.vault.repository;

import com.infosys.vault.model.Category;
import com.infosys.vault.model.VaultItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VaultItemRepository extends JpaRepository<VaultItem, String> {
    List<VaultItem> findByUserIdOrderByUpdatedAtDesc(String userId);
    List<VaultItem> findByUserIdAndCategoryOrderByUpdatedAtDesc(String userId, Category category);
    List<VaultItem> findByUserIdAndFavoriteOrderByUpdatedAtDesc(String userId, boolean favorite);
    Optional<VaultItem> findByIdAndUserId(String id, String userId);
}
