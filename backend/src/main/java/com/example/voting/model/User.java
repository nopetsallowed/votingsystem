package com.example.voting.model;

public class User {
  public String id;
  public String username;
  public String email;
  public String fullName;
  public String profilePhoto;
  public String role;
  public boolean enabled;
  public String createdAt;
  public String updatedAt;

  public User() {}

  public User(String id, String username, String email, String fullName, String role, boolean enabled, String createdAt, String updatedAt) {
    this(id, username, email, fullName, "", role, enabled, createdAt, updatedAt);
  }

  public User(String id, String username, String email, String fullName, String profilePhoto, String role, boolean enabled, String createdAt, String updatedAt) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.fullName = fullName;
    this.profilePhoto = profilePhoto;
    this.role = role;
    this.enabled = enabled;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
