package com.example.project.Repository;

import com.example.project.Entity.FitnessClass;
import com.example.project.Entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

public interface FitnessClassRepository extends JpaRepository <FitnessClass, Long> {

    //derived queries
    boolean existsByRoomAndDayOfWeekAndStartTime(
            Room room,
            DayOfWeek dayOfWeek,
            LocalTime startTime
    );

    Page<FitnessClass> findByDeletedFalseAndRoomIsNotNull(Pageable pageable);

    List<FitnessClass> findByDeletedFalseAndRoomIsNotNull();

    Page<FitnessClass> findByName(String name, Pageable pageable);

    List<FitnessClass> findByYear(int year);
}
