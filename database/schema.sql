-- Starting Point – estrutura do banco (MySQL 8+ / MariaDB 10.5+)

CREATE TABLE IF NOT EXISTS admins (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS photos (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  school_year TINYINT UNSIGNED NOT NULL COMMENT '1 = primeiro ano, 2 = segundo, 3 = terceiro',
  title       VARCHAR(120) NOT NULL,
  taken_at    DATE NOT NULL,
  description TEXT NULL,
  image_url   VARCHAR(500) NOT NULL,
  image_key   VARCHAR(255) NULL COMMENT 'id no serviço de armazenamento (para excluir)',
  storage     VARCHAR(20) NOT NULL DEFAULT 'cloudinary',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_photos_year_date (school_year, taken_at),
  CONSTRAINT chk_photos_year CHECK (school_year BETWEEN 1 AND 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
