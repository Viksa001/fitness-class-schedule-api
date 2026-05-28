package com.example.project.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.DayOfWeek;
import java.time.LocalTime;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"room_id", "dayOfWeek", "startTime"}
        )
)
public class FitnessClass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long fitnessClassId;

    @NotBlank(message = "Class name cannot be empty")
    private String name;

    @Enumerated (EnumType.STRING)
    private DayOfWeek dayOfWeek;

    private LocalTime startTime;

    private int durationMinutes;

    @JsonIgnore
    private boolean deleted = false;

    @ManyToOne
    @JoinColumn(name = "room_id")
    private Room room;

    @ManyToOne
    @JoinColumn(name = "instructor_id")
    private Instructor instructor;


    public FitnessClass() {
    }

    public Long getfitnessClassId() {
        return fitnessClassId;
    }

    public void setFitnessClassId(Long classId) {
        this.fitnessClassId = classId;
    }

    public DayOfWeek getDayOfWeek() {
        return dayOfWeek;
    }

    public void setDayOfWeek(DayOfWeek dayOfWeek) {
        this.dayOfWeek = dayOfWeek;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(int durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public Room getRoom() {
        return room;
    }

    public void setRoom(Room room) {
        this.room = room;
    }

    public Instructor getInstructor() {
        return instructor;
    }

    public void setInstructor(Instructor instructor) {
        this.instructor = instructor;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public boolean isDeleted(){
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }


    //ADD VALIDATION FOR EACH VARIABLE AND CUSTOM ERROR HANDLING
}
