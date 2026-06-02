create table if not exists users (
  id varchar(64) primary key,
  username varchar(191) not null unique,
  email varchar(191) not null unique,
  full_name varchar(191) not null,
  role varchar(32) not null,
  enabled boolean not null,
  created_at varchar(64) not null,
  updated_at varchar(64) not null
);

create table if not exists user_passwords (
  user_id varchar(64) primary key,
  password varchar(255) not null
);

create table if not exists voters (
  id varchar(64) primary key,
  user_id varchar(64) not null unique,
  voter_id_number varchar(191) not null unique,
  date_of_birth varchar(64),
  address text,
  phone varchar(64),
  profile_photo longtext,
  approved boolean not null,
  approved_by varchar(64),
  approved_at varchar(64),
  registered_at varchar(64) not null
);

create table if not exists parties (
  id varchar(64) primary key,
  party_name varchar(191) not null unique,
  acronym varchar(64) not null unique,
  logo longtext,
  description text,
  slogan text,
  leader varchar(191),
  color varchar(32),
  created_at varchar(64) not null,
  updated_at varchar(64) not null
);

create table if not exists positions (
  id varchar(64) primary key,
  position_name varchar(191) not null unique,
  description text,
  winner_slots int not null default 1,
  created_at varchar(64) not null
);

create table if not exists candidates (
  id varchar(64) primary key,
  full_name varchar(191) not null,
  party_id varchar(64),
  position_id varchar(64) not null,
  photo longtext,
  poster longtext,
  biography text,
  platform_statement text,
  achievements text,
  education text,
  contact_info text,
  social_media_links text,
  created_at varchar(64) not null,
  updated_at varchar(64) not null
);

create table if not exists elections (
  id varchar(64) primary key,
  election_name varchar(191) not null,
  description text,
  start_date varchar(64) not null,
  end_date varchar(64) not null,
  banner longtext,
  status varchar(32) not null,
  created_by varchar(64) not null,
  created_at varchar(64) not null,
  updated_at varchar(64) not null
);

create table if not exists election_positions (
  election_id varchar(64) not null,
  position_id varchar(64) not null,
  sort_order int not null,
  winner_slots int not null default 1,
  primary key (election_id, position_id)
);

create table if not exists election_parties (
  election_id varchar(64) not null,
  party_id varchar(64) not null,
  sort_order int not null,
  primary key (election_id, party_id)
);

create table if not exists votes (
  id varchar(64) primary key,
  voter_id varchar(64) not null,
  candidate_id varchar(64) not null,
  election_id varchar(64) not null,
  position_id varchar(64) not null,
  timestamp varchar(64) not null,
  ip_address varchar(64)
);

create table if not exists audit_logs (
  id varchar(64) primary key,
  action varchar(191) not null,
  user_id varchar(64),
  username varchar(191),
  details text,
  ip_address varchar(64),
  timestamp varchar(64) not null
);
