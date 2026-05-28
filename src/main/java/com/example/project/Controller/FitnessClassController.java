package com.example.project.Controller;

import com.example.project.Entity.FitnessClass;
import com.example.project.Service.FitnessClassService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@RestController
@RequestMapping("/classes")
public class FitnessClassController {

    private final FitnessClassService fitnessClassService;
    public FitnessClassController(FitnessClassService fitnessClassService){
        this.fitnessClassService = fitnessClassService;
    }

    @PostMapping
    public FitnessClass createClass (@Valid @RequestBody FitnessClass fitnessClass){
        return fitnessClassService.createClass(fitnessClass);
    }

    @PostMapping("/{id}/schedule")
    public FitnessClass scheduleClass(@PathVariable("id") Long classId, @RequestBody FitnessClass fitnessClass){
           return fitnessClassService.scheduleClass(classId,
                   fitnessClass.getDayOfWeek(),
                   fitnessClass.getStartTime(),
                   fitnessClass.getDurationMinutes(),
                   fitnessClass.getRoom().getRoomId(),
                   fitnessClass.getInstructor().getInstructorId());

    }

    @GetMapping("/{id}")
    public Page<FitnessClass> getFitnessClass(@PathVariable("id") Long classId, Pageable pageable){
        return fitnessClassService.retrieveClass(classId, pageable);
    }

    //GET BUSIEST ROOMS

}
