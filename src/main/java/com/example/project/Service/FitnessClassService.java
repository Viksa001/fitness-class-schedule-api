package com.example.project.Service;

import com.example.project.Entity.FitnessClass;
import com.example.project.Entity.Instructor;
import com.example.project.Entity.Room;
import com.example.project.Repository.FitnessClassRepository;
import com.example.project.Repository.InstructorRepository;
import com.example.project.Repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.PathVariable;
import com.example.project.Exceptions.ConflictException;
import com.example.project.Exceptions.ResourceNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class FitnessClassService {

    @Autowired
    FitnessClassRepository fitnessClassRepository;

    @Autowired
    RoomRepository roomRepository;

    @Autowired
    InstructorRepository instructorRepository;


    public FitnessClass createClass(FitnessClass fitnessClass){
        return fitnessClassRepository.save(fitnessClass);
    }

    public FitnessClass scheduleClass(Long classId, DayOfWeek dayOfWeek, LocalTime startTime, int duration, Long roomId, Long instructorId){
        FitnessClass fitnessClass = fitnessClassRepository.findById(classId).orElseThrow(() -> new ResourceNotFoundException("Class not found!"));
        Room room = roomRepository.findById(roomId).orElseThrow(() -> new ResourceNotFoundException("Room not found!"));
        Instructor instructor = instructorRepository.findById(instructorId).orElseThrow(() -> new ResourceNotFoundException("Instructor not found!"));

        boolean slotTaken = fitnessClassRepository.existsByRoomAndDayOfWeekAndStartTime(room, dayOfWeek, startTime);

        if (slotTaken){
            throw new ConflictException("The slot is already taken!");
        }

        fitnessClass.setDayOfWeek(dayOfWeek);
        fitnessClass.setStartTime(startTime);
        fitnessClass.setDurationMinutes(duration);
        fitnessClass.setRoom(room);
        fitnessClass.setInstructor(instructor);

        return fitnessClassRepository.save(fitnessClass);
    }

    public Page<FitnessClass> retrieveClass (Long FitnessClassId, Pageable pageable){
        FitnessClass fitnessClass = fitnessClassRepository.findById(FitnessClassId).orElseThrow(() -> new ResourceNotFoundException("Class not found!"));
        return fitnessClassRepository.findByName(fitnessClass.getName(), pageable);
    }

    public Page<FitnessClass> getSchedule(Pageable pageable){
        return fitnessClassRepository.findByDeletedFalseAndRoomIsNotNull(pageable);
    }

    public void softDelete (Long id){
        FitnessClass fitnessClass = fitnessClassRepository.findById(id).orElseThrow(()-> new ResourceNotFoundException("Class not found!"));
        fitnessClass.setDeleted(true);
        fitnessClassRepository.save(fitnessClass);
    }


    public List<Room> getBusiestRooms() {
        List<FitnessClass> classes = fitnessClassRepository.findByDeletedFalseAndRoomIsNotNull();

        Map<Room, Integer> roomMinutes = new HashMap<>();

        for (FitnessClass fc : classes) {
            Room room = fc.getRoom();
            int current = roomMinutes.getOrDefault(room, 0);
            roomMinutes.put(room, current + fc.getDurationMinutes());
        }

        List<Room> rooms = new ArrayList<>(roomMinutes.keySet());
        rooms.sort((a, b) -> roomMinutes.get(b) - roomMinutes.get(a));

        for (Room room : rooms) {
            room.setTotalMinutes(roomMinutes.get(room));
        }

        return rooms;
    }

}
