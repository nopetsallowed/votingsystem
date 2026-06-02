package com.example.voting.model;

public class Position {
  public String id;
  public String positionName;
  public String description;
  public String createdAt;

  public Position() {}

  public Position(String id, String positionName, String description, String createdAt) {
    this.id = id;
    this.positionName = positionName;
    this.description = description;
    this.createdAt = createdAt;
  }
}
