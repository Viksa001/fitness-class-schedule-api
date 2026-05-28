package com.example.project.Controller;

import com.example.project.Entity.FitnessClass;
import com.example.project.Service.FitnessClassService;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@RestController
@RequestMapping("/schedule")
public class ScheduleController {

    private final FitnessClassService fitnessClassService;
    public ScheduleController(FitnessClassService fitnessClassService) {
        this.fitnessClassService = fitnessClassService;
    }

    @GetMapping
    public Page<FitnessClass> getSchedule(Pageable pageable){
        return fitnessClassService.getSchedule(pageable);
    }

    @DeleteMapping("/{id}")
    public void deleteScheduledSpot(@PathVariable Long id){
        fitnessClassService.softDelete(id);
    }
}
