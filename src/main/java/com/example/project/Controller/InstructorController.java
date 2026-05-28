package com.example.project.Controller;


import com.example.project.Entity.Instructor;
import com.example.project.Service.InstructorService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@RestController
@RequestMapping("/instructors")
public class InstructorController {

    private final InstructorService instructorService;
    public InstructorController(InstructorService instructorService){
        this.instructorService = instructorService;
    }

    @PostMapping
    public Instructor createInstruction(@Valid @RequestBody Instructor instruction){
        return instructorService.registerInstructor(instruction);
    }

    //Additional endpoint
    @GetMapping
    public Page<Instructor> getAllInstructors(Pageable pageable){
        return instructorService.getInstructors(pageable);
    }
}
