package com.example.project.Controller;


import com.example.project.Entity.Room;
import com.example.project.Service.FitnessClassService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@RestController
@RequestMapping("/reports")
public class ReportsController {


    private final FitnessClassService fitnessClassService;
    public ReportsController(FitnessClassService fitnessClassService){
        this.fitnessClassService = fitnessClassService;
    }

    @GetMapping("/busiest-rooms")
    public List<Room> busiestRooms(){
        return fitnessClassService.getBusiestRooms();
    }

}
