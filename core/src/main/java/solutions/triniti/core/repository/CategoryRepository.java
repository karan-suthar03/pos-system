package solutions.triniti.core.repository;

import com.j256.ormlite.dao.Dao;
import com.j256.ormlite.dao.DaoManager;
import solutions.triniti.core.db.OrmLiteConnectionProvider;
import solutions.triniti.core.model.Category;

import java.util.List;

public class CategoryRepository {

    private final Dao<Category, Integer> categoryDao;

    public CategoryRepository(OrmLiteConnectionProvider ormLiteConnectionProvider) {
        if (ormLiteConnectionProvider == null) {
            throw new IllegalArgumentException("Connection provider cannot be null");
        }

        Dao<Category, Integer> resolvedDao;
        try {
            resolvedDao = DaoManager.createDao(ormLiteConnectionProvider.getConnectionSource(), Category.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialize ORMLite DAO for categories", e);
        }

        this.categoryDao = resolvedDao;
    }

    public List<Category> listAll() throws Exception {
        return categoryDao.queryBuilder()
            .orderBy("name", true)
            .query();
    }

    public Category getById(int id) throws Exception {
        if (id <= 0) {
            return null;
        }
        return categoryDao.queryForId(id);
    }

    public Category getByName(String name) throws Exception {
        String normalized = normalizeName(name);
        if (normalized == null) {
            return null;
        }

        List<Category> matches = categoryDao.queryBuilder()
            .where()
            .eq("name", normalized)
            .query();

        return matches.isEmpty() ? null : matches.get(0);
    }

    public int getOrCreateId(String name) throws Exception {
        Category existing = getByName(name);
        if (existing != null) {
            return existing.category_id;
        }

        Category category = new Category();
        category.name = normalizeName(name);
        categoryDao.create(category);
        return category.category_id;
    }

    public Category upsertByName(String name, String imagePath, boolean clearImage) throws Exception {
        String normalized = normalizeName(name);
        if (normalized == null) {
            throw new IllegalArgumentException("Category name is required");
        }

        Category category = getByName(normalized);
        if (category == null) {
            category = new Category();
            category.name = normalized;
            category.image_path = normalizeImagePath(imagePath, clearImage);
            categoryDao.create(category);
            return category;
        }

        if (clearImage || imagePath != null) {
            category.image_path = normalizeImagePath(imagePath, clearImage);
            categoryDao.update(category);
        }

        return category;
    }

    public Category updateImageById(int categoryId, String imagePath, boolean clearImage) throws Exception {
        Category category = getById(categoryId);
        if (category == null) {
            return null;
        }

        if (clearImage || imagePath != null) {
            category.image_path = normalizeImagePath(imagePath, clearImage);
            categoryDao.update(category);
        }

        return category;
    }

    private String normalizeName(String name) {
        if (name == null) {
            return null;
        }

        String normalized = name.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeImagePath(String imagePath, boolean clearImage) {
        if (clearImage) {
            return null;
        }

        if (imagePath == null) {
            return null;
        }

        String normalized = imagePath.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
