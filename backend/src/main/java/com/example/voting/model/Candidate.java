package com.example.voting.model;

public class Candidate {
  public String id;
  public String fullName;
  public String partyId;
  public String positionId;
  public String photo;
  public String poster;
  public String biography;
  public String platformStatement;
  public String achievements;
  public String education;
  public String contactInfo;
  public String socialMediaLinks;
  public String createdAt;
  public String updatedAt;

  public Candidate() {}

  public Candidate(String id, String fullName, String partyId, String positionId, String photo, String poster, String biography, String platformStatement, String achievements, String education, String contactInfo, String socialMediaLinks, String createdAt, String updatedAt) {
    this.id = id;
    this.fullName = fullName;
    this.partyId = partyId;
    this.positionId = positionId;
    this.photo = photo;
    this.poster = poster;
    this.biography = biography;
    this.platformStatement = platformStatement;
    this.achievements = achievements;
    this.education = education;
    this.contactInfo = contactInfo;
    this.socialMediaLinks = socialMediaLinks;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
