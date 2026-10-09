package com.smartattendance.backend.repository;

import com.smartattendance.backend.model.ClassEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClassRepository extends JpaRepository<ClassEntity, String> {
    List<ClassEntity> findByInstituteId(String instituteId);
}
