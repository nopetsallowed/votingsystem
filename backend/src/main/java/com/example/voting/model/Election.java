package com.example.voting.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Election {
  public String id;
  public String electionName;
  public String description;
  public String startDate;
  public String endDate;
  public String banner;
  public String status;
  public String createdBy;
  public List<String> partyIds = new ArrayList<>();
  public List<String> positions = new ArrayList<>();
  public Map<String, Integer> positionWinnerSlots = new HashMap<>();
  public String createdAt;
  public String updatedAt;
}
