package com.example.project.Controller;


import com.example.project.Entity.Room;
import com.example.project.Service.RoomService;
import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;



import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/rooms")
public class RoomController {

    private final RoomService roomService;
    public RoomController (RoomService roomService){
        this.roomService = roomService;
    }

    @PostMapping
    public Room createRoom(@Valid @RequestBody Room room){
        return roomService.registerRoom(room);
    }

    //Additional endpoint
    @GetMapping
    public Page<Room> getRooms(Pageable pageable){
        return roomService.listAllRooms(pageable);
    }
}
