package com.example.project.Service;

import com.example.project.Entity.Instructor;
import com.example.project.Repository.InstructorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@Service
public class InstructorService {

    @Autowired
    InstructorRepository instructorRepository;

    public Instructor registerInstructor(Instructor instructor){
        return instructorRepository.save(instructor);
    }

    //Additional endpoint
    public Page<Instructor> getInstructors(Pageable pageable){
        return instructorRepository.findAll(pageable);
    }
}
