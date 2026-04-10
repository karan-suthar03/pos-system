package solutions.triniti.core.repository;

import com.j256.ormlite.dao.Dao;
import com.j256.ormlite.dao.DaoManager;
import com.j256.ormlite.stmt.QueryBuilder;
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
        QueryBuilder<Category, Integer> queryBuilder = categoryDao.queryBuilder();
        queryBuilder.where().isNull("deleted_at");
        queryBuilder.orderBy("name", true);
        return queryBuilder.query();
    }

    public List<Category> listAllForSync() throws Exception {
        QueryBuilder<Category, Integer> queryBuilder = categoryDao.queryBuilder();
        queryBuilder.orderBy("id", true);
        return queryBuilder.query();
    }

    public List<Category> listUpdatedSinceForSync(long updatedAfterExclusive) throws Exception {
        QueryBuilder<Category, Integer> queryBuilder = categoryDao.queryBuilder();
        if (updatedAfterExclusive > 0) {
            queryBuilder.where().gt("updated_at", updatedAfterExclusive);
        }
        queryBuilder.orderBy("updated_at", true);
        queryBuilder.orderBy("id", true);
        return queryBuilder.query();
    }

    public Category getById(int id) throws Exception {
        if (id <= 0) {
            return null;
        }
        List<Category> matches = categoryDao.queryBuilder()
            .where()
            .eq("id", id)
            .and()
            .isNull("deleted_at")
            .query();

        return matches.isEmpty() ? null : matches.get(0);
    }

    public Category getByName(String name) throws Exception {
        return findByName(name, false);
    }

    public int getOrCreateId(String name) throws Exception {
        Category existing = findByName(name, true);
        if (existing != null) {
            if (existing.deleted_at != null && existing.deleted_at > 0) {
                existing.deleted_at = null;
                categoryDao.update(existing);
            }
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

        Category category = findByName(normalized, true);
        if (category == null) {
            category = new Category();
            category.name = normalized;
            category.image_path = normalizeImagePath(imagePath, clearImage);
            categoryDao.create(category);
            return category;
        }

        if (category.deleted_at != null && category.deleted_at > 0) {
            category.deleted_at = null;
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

    private Category findByName(String name, boolean includeDeleted) throws Exception {
        String normalized = normalizeName(name);
        if (normalized == null) {
            return null;
        }

        QueryBuilder<Category, Integer> queryBuilder = categoryDao.queryBuilder();
        com.j256.ormlite.stmt.Where<Category, Integer> where = queryBuilder.where();
        where.eq("name", normalized);
        if (!includeDeleted) {
            where.and().isNull("deleted_at");
        }

        List<Category> matches = queryBuilder.query();
        return matches.isEmpty() ? null : matches.get(0);
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
