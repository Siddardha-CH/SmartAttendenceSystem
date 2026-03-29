package com.smartattendance.backend.repository;

import com.smartattendance.backend.model.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, String> {

    @Query("SELECT a FROM AttendanceRecord a WHERE a.date = :date")
    List<AttendanceRecord> findByDate(@Param("date") String date);

    @Query("SELECT a FROM AttendanceRecord a WHERE a.date = :date AND a.studentId = :studentId")
    Optional<AttendanceRecord> findByDateAndStudentId(@Param("date") String date, @Param("studentId") String studentId);
}
