-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 10, 2025 at 01:21 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `creo_certificate`
--

-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS tesda_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Optional sample data
INSERT INTO tesda_records (title) VALUES 
  ('TESDA NC II: Programming'),
  ('TESDA NC II: Animation'),
  ('TESDA NC II: Electrical Installation');

--
-- Table structure for table `credential_tbl`
--

CREATE TABLE `credential_tbl` (
  `credential_id` int(11) NOT NULL,
  `credential_username` varchar(20) DEFAULT NULL,
  `credential_password` varchar(255) NOT NULL,
  `credential_email` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `credential_tbl`
--

INSERT INTO `credential_tbl` (`credential_id`, `credential_username`, `credential_password`, `credential_email`) VALUES
(1, 'creoapp25', 'creotec123', '');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `credential_tbl`
--
ALTER TABLE `credential_tbl`
  ADD PRIMARY KEY (`credential_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `credential_tbl`
--
ALTER TABLE `credential_tbl`
  MODIFY `credential_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;


-- Main table for storing generated file information
CREATE TABLE generated_files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_type ENUM('grades', 'report', 'other') DEFAULT 'grades',
    batch VARCHAR(100),
    school VARCHAR(255),
    date_of_immersion DATE,
    total_students INT DEFAULT 0,
    file_path VARCHAR(500),
    file_size BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(100), -- optional user tracking
    status ENUM('active', 'deleted') DEFAULT 'active'
);

-- Table for storing student data associated with each generated file
CREATE TABLE generated_file_students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    file_id INT NOT NULL,
    student_number VARCHAR(50),
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    strand VARCHAR(100),
    department VARCHAR(100),
    school VARCHAR(255),
    batch VARCHAR(100),
    date_of_immersion DATE,
    
    -- Performance Appraisal
    over_all DECIMAL(5,1),
    
    -- Common grades for all departments (NTOP & WVS)
    WI DECIMAL(5,0),
CO DECIMAL(5,0),
`5S` DECIMAL(5,0),
BO DECIMAL(5,0),
CBO DECIMAL(5,0),
SDG DECIMAL(5,0),
OHSA DECIMAL(5,0),
WE DECIMAL(5,0),
UJC DECIMAL(5,0),
ISO DECIMAL(5,0),
PO DECIMAL(5,0),
HR DECIMAL(5,0),
DS DECIMAL(5,0),

-- Production specific grades
WI2 DECIMAL(5,0),
ELEX DECIMAL(5,0),
CM DECIMAL(5,0),
SPC DECIMAL(5,0),
PROD DECIMAL(5,0),

-- Support specific grades
PerDev DECIMAL(5,0),
Supp DECIMAL(5,0),

-- Technical specific grades
AppDev DECIMAL(5,0),
Tech DECIMAL(5,0),

    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (file_id) REFERENCES generated_files(id) ON DELETE CASCADE,
    INDEX idx_file_id (file_id),
    INDEX idx_department (department),
    INDEX idx_student_name (last_name, first_name)
);

-- Table for tracking file operations/history
CREATE TABLE file_operations_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    file_id INT NOT NULL,
    operation_type ENUM('create', 'update', 'download', 'delete') NOT NULL,
    operation_details JSON,
    performed_by VARCHAR(100),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (file_id) REFERENCES generated_files(id) ON DELETE CASCADE,
    INDEX idx_file_operations (file_id, operation_type)
);

-- Optional: Table for storing file metadata and settings
CREATE TABLE file_generation_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    file_id INT NOT NULL,
    template_used VARCHAR(255),
    generation_parameters JSON,
    custom_settings JSON,
    
    FOREIGN KEY (file_id) REFERENCES generated_files(id) ON DELETE CASCADE
);

-- Sample indexes for better performance
CREATE INDEX idx_generated_files_batch ON generated_files(batch);
CREATE INDEX idx_generated_files_school ON generated_files(school);
CREATE INDEX idx_generated_files_created_at ON generated_files(created_at);
CREATE INDEX idx_generated_files_status ON generated_files(status);

-- Sample views for easier querying
CREATE VIEW active_generated_files AS
SELECT 
    gf.*,
    COUNT(gfs.id) as student_count,
    MAX(gfs.updated_at) as last_student_update
FROM generated_files gf
LEFT JOIN generated_file_students gfs ON gf.id = gfs.file_id
WHERE gf.status = 'active'
GROUP BY gf.id;

CREATE VIEW file_summary AS
SELECT 
    gf.id,
    gf.filename,
    gf.batch,
    gf.school,
    gf.created_at,
    gf.updated_at,
    COUNT(gfs.id) as total_students,
    COUNT(CASE WHEN gfs.department IN ('PRODUCTION', 'PROD') THEN 1 END) as production_students,
    COUNT(CASE WHEN gfs.department IN ('TECHNICAL', 'IT') THEN 1 END) as technical_students,
    COUNT(CASE WHEN gfs.department NOT IN ('PRODUCTION', 'PROD', 'TECHNICAL', 'IT') THEN 1 END) as support_students,
    AVG(gfs.over_all) as average_performance
FROM generated_files gf
LEFT JOIN generated_file_students gfs ON gf.id = gfs.file_id
WHERE gf.status = 'active'
GROUP BY gf.id;
