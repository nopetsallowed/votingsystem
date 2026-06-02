package com.example.voting.model;

public class Party {
  public String id;
  public String partyName;
  public String acronym;
  public String logo;
  public String description;
  public String slogan;
  public String leader;
  public String color;
  public String createdAt;
  public String updatedAt;

  public Party() {}

  public Party(String id, String partyName, String acronym, String logo, String description, String slogan, String leader, String color, String createdAt, String updatedAt) {
    this.id = id;
    this.partyName = partyName;
    this.acronym = acronym;
    this.logo = logo;
    this.description = description;
    this.slogan = slogan;
    this.leader = leader;
    this.color = color;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
