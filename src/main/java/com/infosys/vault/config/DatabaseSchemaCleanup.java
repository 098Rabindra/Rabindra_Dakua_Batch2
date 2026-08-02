package com.infosys.vault.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.logging.Level;
import java.util.logging.Logger;

@Component
public class DatabaseSchemaCleanup implements CommandLineRunner {

    private static final Logger LOGGER = Logger.getLogger(DatabaseSchemaCleanup.class.getName());
    private final JdbcTemplate jdbcTemplate;

    public DatabaseSchemaCleanup(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            jdbcTemplate.execute("ALTER TABLE users DROP COLUMN IF EXISTS otp, DROP COLUMN IF EXISTS status");
            LOGGER.info("Successfully dropped 'otp' and 'status' columns from 'users' table if present.");
        } catch (DataAccessException e) {
            LOGGER.log(Level.WARNING, "Could not execute column cleanup SQL: {0}", e.getMessage());
        }
    }
}
