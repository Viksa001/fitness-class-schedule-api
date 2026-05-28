package com.example.project.Service;


import com.example.project.Entity.FitnessClass;
import com.example.project.Entity.Room;
import com.example.project.Repository.RoomRepository;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

@Service
public class RoomService {

    @Autowired
    RoomRepository roomRepository;

    public Room registerRoom(Room room){
        return roomRepository.save(room);
    }

    public Page<Room> listAllRooms(Pageable pageable) {
         return roomRepository.findAll(pageable);
    }

}
