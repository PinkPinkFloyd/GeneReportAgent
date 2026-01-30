-- CreateTable
CREATE TABLE `SnpDefinition` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `rsid` VARCHAR(32) NOT NULL,
    `chromosome` VARCHAR(5) NOT NULL,
    `position` INTEGER NOT NULL,
    `referenceAllele` CHAR(1) NULL,
    `alternateAllele` CHAR(1) NULL,
    `geneSymbol` VARCHAR(64) NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SnpDefinition_rsid_key`(`rsid`),
    INDEX `SnpDefinition_chromosome_position_idx`(`chromosome`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserSnpResult` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` BIGINT NOT NULL,
    `rsid` VARCHAR(32) NOT NULL,
    `chromosome` VARCHAR(5) NOT NULL,
    `position` INTEGER NOT NULL,
    `genotype` CHAR(2) NOT NULL,
    `quality` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserSnpResult_userId_chromosome_position_idx`(`userId`, `chromosome`, `position`),
    UNIQUE INDEX `UserSnpResult_userId_rsid_key`(`userId`, `rsid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SnpInterpretation` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `rsid` VARCHAR(32) NOT NULL,
    `category` VARCHAR(64) NULL,
    `interpretation` TEXT NOT NULL,
    `population` VARCHAR(64) NULL,
    `evidenceLevel` VARCHAR(191) NOT NULL DEFAULT 'low',
    `source` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SnpInterpretation_rsid_category_idx`(`rsid`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SnpRule` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `rsid` VARCHAR(32) NOT NULL,
    `genotype` CHAR(2) NOT NULL,
    `conclusion` TEXT NOT NULL,
    `confidence` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `recommendation` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SnpRule_rsid_genotype_key`(`rsid`, `genotype`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
