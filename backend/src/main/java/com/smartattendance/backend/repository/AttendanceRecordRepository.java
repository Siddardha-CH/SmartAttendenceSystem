package com.smartattendance.backend.repository;

import com.smartattendance.backend.model.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, String> {

    // Spring Data builds the SQL from the method name: WHERE date = ? ORDER BY time
    List<AttendanceRecord> findByDateOrderByTimeAsc(String date);

    // "First" so it never throws if old data already contains duplicates for the same day.
    Optional<AttendanceRecord> findFirstByDateAndStudentId(String date, String studentId);

    default List<AttendanceRecord> findByDate(String date) {
        return findByDateOrderByTimeAsc(date);
    }
}
