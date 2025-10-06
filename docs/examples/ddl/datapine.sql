create table booking
(
    id                 int auto_increment
        primary key,
    user_id            int                                     not null,
    calendar_id        int                                     null,
    patient_id         int                                     null,
    type_id            int                                     not null,
    visit_type_id      int                                     null,
    status_id          int                                     not null,
    start_date         datetime  default '0000-00-00 00:00:00' not null,
    end_date           datetime  default '0000-00-00 00:00:00' not null,
    meta_data          text                                    null,
    created_at         timestamp default '0000-00-00 00:00:00' not null,
    updated_at         timestamp                               null,
    google_id          varchar(255) as (json_value(`meta_data`, '$.google_id')) stored,
    google_resource_id varchar(255) as (json_value(`meta_data`, '$.google_resource_id')) stored,
    create_date        date as (cast(`created_at` as date)) stored,
    created_by_doctor  tinyint(1) as (ifnull(json_extract(`meta_data`, '$.created_by_doctor'), 'false') =
                                      'true') stored,
    confirmed_at       date as (cast(json_value(`meta_data`, '$.confirmation.confirmed_at') as date)) stored,
    constraint booking_fk_calendar
        foreign key (calendar_id) references calendar (id)
            on update cascade on delete cascade,
    constraint booking_fk_patient
        foreign key (patient_id) references patient (id)
            on update cascade on delete cascade,
    constraint `booking_fk_taxonomy (status_id)`
        foreign key (status_id) references taxonomy (id)
            on update cascade,
    constraint `booking_fk_taxonomy (type_id)`
        foreign key (type_id) references taxonomy (id)
            on update cascade,
    constraint booking_fk_user
        foreign key (user_id) references user (id)
            on update cascade on delete cascade,
    constraint booking_fk_visittype
        foreign key (visit_type_id) references visittype (id)
            on update cascade on delete cascade
)
    collate = utf8mb4_unicode_ci;

create index calendar_id
    on booking (calendar_id);

create index confirmed_at
    on booking (confirmed_at);

create index create_date
    on booking (create_date);

create index create_date_type_id
    on booking (create_date, type_id);

create index google_id
    on booking (google_id);

create index google_resource_id
    on booking (google_resource_id);

create index patient_id
    on booking (patient_id);

create index status_id
    on booking (status_id);

create index type_id
    on booking (type_id);

create index user_id
    on booking (user_id);

create index user_id_status_id_type_id_start_date
    on booking (user_id, status_id, type_id, start_date);

create index user_id_type_id_google_resource_id
    on booking (user_id, type_id, google_resource_id);

create index visit_type_id
    on booking (visit_type_id);

create table datapine_dates
(
    date date not null
)
    charset = latin1;

create table datapine_events
(
    id                int                                     not null
        primary key,
    type_id           int                                     not null,
    user_id           int                                     not null,
    unit_id           int                                     not null,
    contract_id       int                                     null,
    validity_id       int                                     not null,
    validity          varchar(100)                            not null,
    comment           mediumtext                              null,
    event_date        timestamp default '0000-00-00 00:00:00' not null,
    event_finish_date timestamp                               null,
    duration          bigint    default 0                     not null,
    is_processed      int       default 0                     not null
);

create index event_date
    on datapine_events (event_date);

create index is_processed
    on datapine_events (is_processed);

create index type_id
    on datapine_events (type_id);

create index type_id_event_finish_date
    on datapine_events (type_id, event_finish_date);

create index type_id_validity_id
    on datapine_events (type_id, validity_id);

create index unit_id
    on datapine_events (unit_id);

create index unit_id_type_id
    on datapine_events (unit_id, type_id);

create index unit_id_user_id_event_date
    on datapine_events (unit_id, user_id, event_date);

create index user_id
    on datapine_events (user_id);

create table datapine_events_customfields
(
    id        int auto_increment
        primary key,
    event_id  int not null,
    int_value int null
);

create table datapine_events_objectstasks
(
    id             int auto_increment
        primary key,
    event_id       int           not null,
    object_task_id int           not null,
    acceptance     int default 0 not null,
    comment        mediumtext    null
);

create index acceptance
    on datapine_events_objectstasks (acceptance);

create index event_id
    on datapine_events_objectstasks (event_id);

create index object_taks_id_acceptance
    on datapine_events_objectstasks (object_task_id, acceptance);

create index object_task_id
    on datapine_events_objectstasks (object_task_id);

create table datapine_execution
(
    id             int                                      not null
        primary key,
    routine        varchar(255) default 'export_entities'   not null,
    execution_date timestamp    default current_timestamp() not null on update current_timestamp(),
    execution_time varchar(255)                             not null
);

create table datapine_feedbacks_control
(
    id                 int unsigned auto_increment
        primary key,
    feedback_id        int            not null,
    inspection_id      int            not null,
    inspection_unit_id int            not null,
    object_task_id     int            not null,
    acceptance         int default -1 not null,
    comment            mediumtext     null,
    acceptance_date    datetime       null
);

create index feedback_id
    on datapine_feedbacks_control (feedback_id);

create index inspection_id
    on datapine_feedbacks_control (inspection_id);

create index inspection_unit_id
    on datapine_feedbacks_control (inspection_unit_id);

create index inspection_unit_id_object_task_id
    on datapine_feedbacks_control (inspection_unit_id, object_task_id);

create table datapine_feedbacks_insta
(
    id                 int auto_increment
        primary key,
    feedback_id        int           not null,
    inspection_id      int           not null,
    inspection_unit_id int           not null,
    object_group_id    int           not null,
    object_group_str   varchar(255)  not null,
    waste_a            int default 0 not null,
    waste_na           int default 0 not null,
    dust_a             int default 0 not null,
    dust_na            int default 0 not null,
    stains_a           int default 0 not null,
    stains_na          int default 0 not null,
    surface_a          int default 0 not null,
    surface_na         int default 0 not null,
    soiling_level1     int default 5 not null,
    soiling_level2     int default 5 not null
);

create index inspection_id
    on datapine_feedbacks_insta (inspection_id);

create table datapine_inspections
(
    id                            int auto_increment
        primary key,
    subscriber_id                 int                                         not null,
    customer_id                   int                                         not null,
    inspection_id                 int                                         not null,
    subscriber_name               varchar(255)                                not null,
    customer_name                 varchar(255)                                not null,
    inspection_name               varchar(255)                                not null,
    started_at                    timestamp     default '0000-00-00 00:00:00' null,
    finished_at                   datetime      default '0000-00-00 00:00:00' null,
    clustered                     tinyint(1)    default 0                     null,
    acceptance                    int           default 0                     null,
    acceptance_str                varchar(255)                                null,
    completion_percent            decimal(5, 2)                               null,
    acceptance_percent            decimal(5, 2)                               null,
    percent_of_accepted           decimal(5, 2)                               null,
    accepted_percent_of_inspected decimal(5, 2) default 0.00                  null,
    spent_time                    int           default 0                     not null,
    contract_id                   int                                         not null,
    contract_name                 varchar(255)                                not null,
    status_id                     int           default 200205                not null,
    status                        varchar(255)                                not null,
    inspection_type               varchar(255)                                not null,
    inspection_method_id          int                                         not null,
    inspection_method             varchar(255)                                not null,
    schedule_type                 varchar(255)                                null,
    aql_acpercentage              decimal(5, 2)                               not null,
    planned_date                  date                                        null,
    completed_at                  datetime                                    null,
    is_reexportable               int           default 1                     not null
);

create index complex_key
    on datapine_inspections (inspection_id, inspection_method_id, completion_percent, is_reexportable);

create index contract_id_inspection_id
    on datapine_inspections (contract_id, inspection_id);

create index customer_id
    on datapine_inspections (customer_id);

create index customer_id_completion_percent
    on datapine_inspections (customer_id, completion_percent);

create index customer_id_completion_percent_finished_at
    on datapine_inspections (customer_id, finished_at, completion_percent);

create index inspection_id
    on datapine_inspections (inspection_id);

create index inspection_id_status_id
    on datapine_inspections (inspection_id, status_id);

create index inspection_name
    on datapine_inspections (inspection_name);

create index is_reexportable
    on datapine_inspections (is_reexportable);

create index planned_date
    on datapine_inspections (planned_date);

create index status_id
    on datapine_inspections (status_id);

create index subscriber_id
    on datapine_inspections (subscriber_id);

create table datapine_profiles
(
    id               int auto_increment
        primary key,
    inspection_id    int          not null,
    profile_name     varchar(255) not null,
    lot_size         int          not null,
    sample_size      int          not null,
    ac_number        int          not null,
    re_number        int          not null,
    accepted         int          not null,
    rejected         int          not null,
    rejected_insta   int          not null,
    rejected_hygiene int          not null,
    acceptance       int          not null,
    completed        int          not null
);

create index inspection_id
    on datapine_profiles (inspection_id);

create table datapine_workorders
(
    id                    int               not null
        primary key,
    subscriber_id         int               not null,
    subscriber_name       varchar(255)      not null,
    customer_id           int               not null,
    unit_id               int               not null,
    parent_id             int               null,
    workorder_contract_id int               null,
    contract_id           int               null,
    inspection_unit_id    int               null,
    contract_name         varchar(255)      null,
    building_id           int               not null,
    building_name         varchar(255)      not null,
    building_address      varchar(255)      not null,
    parent_unique_number  varchar(255)      null,
    issue_type_id         int               not null,
    issue_type_str        varchar(255)      not null,
    status_id             int               not null,
    status_str            varchar(255)      not null,
    state_id              int               not null,
    state_str             varchar(255)      not null,
    trigger_type_id       int               not null,
    trigger_type_str      varchar(255)      not null,
    unique_number         varchar(255)      not null,
    object_task_id        int               null,
    control_group         varchar(255)      null,
    control_task          varchar(255)      null,
    comment               mediumtext        null,
    manager_comment       mediumtext        null,
    unit_comment          mediumtext        null,
    nfc_required          int     default 0 not null,
    invoked_by_tag        int     default 0 not null,
    priority              int               not null,
    priority_str          varchar(255)      not null,
    is_autocompleted      tinyint default 0 not null,
    created_at            timestamp         null,
    assigned_at           timestamp         null,
    accepted_at           timestamp         null,
    started_at            timestamp         null,
    finished_at           timestamp         null,
    performer             varchar(255)      null,
    duration              bigint  default 0 null
);

create index customer_id_finished_at
    on datapine_workorders (customer_id, finished_at);

create table datapine_workorders_tasks
(
    id              int auto_increment
        primary key,
    workorder_id    int           null,
    task_id         int           not null,
    completion      int default 0 not null,
    completion_date datetime      null
);

create index workorder_id
    on datapine_workorders_tasks (workorder_id);

create table entitiesgroups_sensors
(
    EntityGroupSensorID int auto_increment
        primary key,
    EntityGroupID       int not null,
    SensorID            int not null,
    constraint entitiesgroups_entititesgroups
        foreign key (EntityGroupID) references entitiesgroups (EntityGroupID)
            on update cascade on delete cascade,
    constraint entitiesgroups_sensor_fk_sensors
        foreign key (SensorID) references sensors (SensorID)
            on update cascade on delete cascade
);

create index EntityGroupID
    on entitiesgroups_sensors (EntityGroupID);

create index SensorID
    on entitiesgroups_sensors (SensorID);

create definer = root@`192.168.168.%` view datapine_buildings as
(
select `b`.`BuildingID` AS `id`,
       `b`.`CustomerID` AS `customer_id`,
       `b`.`StatusID`   AS `status_id`,
       `t`.`Name`       AS `status`,
       `b`.`Name`       AS `name`,
       `b`.`Address`    AS `address`,
       `b`.`Latitude`   AS `latitude`,
       `b`.`Longitude`  AS `longitude`
from ((`dispotronic_insta_test`.`buildings` `b` join `datapine`.`datapine_customers` `dc` on (`dc`.`id` = `b`.`CustomerID`)) left join `dispotronic_insta_test`.`taxonomy` `t` on (`t`.`TaxonomyID` = `b`.`StatusID`))
where `b`.`StatusID` <> 100502);

create definer = root@`192.168.168.%` view datapine_contracts as
(
select `cnt`.`ContractID` AS `id`, `cnt`.`CustomerID` AS `customer_id`, `t`.`Name` AS `status`, `cnt`.`Name` AS `name`, `cnt`.`Description` AS `description`, `cnt`.`AQL` AS `aql`
from ((`dispotronic_insta_test`.`contracts` `cnt` left join `dispotronic_insta_test`.`taxonomy` `t` on (`t`.`TaxonomyID` = `cnt`.`StatusID`)) join `datapine`.`datapine_customers` `dc` on (`dc`.`id` = `cnt`.`CustomerID`)));

create definer = root@`192.168.168.%` view datapine_contracts_buildings as
(
select `cb`.`ContractBuildingID` AS `id`, `cb`.`ContractID` AS `contract_id`, `cb`.`BuildingID` AS `building_id`
from `dispotronic_insta_test`.`contracts_buildings` `cb`);

create definer = root@`192.168.168.%` view datapine_customers as
(
select `c`.`CustomerID` AS `id`, `t`.`Name` AS `status`, `c`.`Name` AS `name`, `s`.`SubscriberID` AS `subscriber_id`, `s`.`Name` AS `subscriber`, `c`.`Description` AS `description`
from ((`dispotronic_insta_test`.`customers` `c` join `dispotronic_insta_test`.`subscribers` `s` on (`s`.`SubscriberID` = `c`.`SubscriberID`)) left join `dispotronic_insta_test`.`taxonomy` `t` on (`t`.`TaxonomyID` = `c`.`StatusID`))
where `c`.`StatusID` = 100501
  and `s`.`StatusID` = 100202);

create definer = root@`192.168.168.%` view datapine_displays as
(
select `d`.`DisplayID`     AS `id`,
       `d`.`CustomerID`    AS `customer_id`,
       `d`.`UnitID`        AS `unit_id`,
       `d`.`TypeID`        AS `type_id`,
       `d`.`StatusID`      AS `status_id`,
       `d`.`BatteryTypeID` AS `battery_type_id`,
       `d`.`UID`           AS `uid`,
       `d`.`Description`   AS `description`,
       `d`.`Info`          AS `info`,
       `d`.`PIR`           AS `pir`
from `dispotronic_insta_test`.`displays` `d`);

create definer = root@`192.168.168.%` view datapine_displaysinfo as
(
select `di`.`DisplayInfoID`     AS `id`,
       `di`.`DisplayID`         AS `display_id`,
       `di`.`BatteryLevel`      AS `battery_level`,
       `di`.`SignalStrength`    AS `signal_strength`,
       `di`.`VisitorPIR`        AS `visitor_pir`,
       `di`.`ActionPIR`         AS `action_pir`,
       `di`.`Firmware`          AS `firmware`,
       `di`.`ConfiguredAt`      AS `configured_at`,
       `di`.`UploadedAt`        AS `uploaded_at`,
       `di`.`ReceivedAt`        AS `received_at`,
       `di`.`BatteryReplacedAt` AS `battery_replaced_at`,
       `di`.`BatteryNotifiedAt` AS `battery_notified_at`,
       `di`.`SignalNotifiedAt`  AS `signal_notified_at`
from `dispotronic_insta_test`.`displaysinfo` `di`);

create definer = root@`192.168.168.%` view datapine_displayspirs as
(
select `dp`.`DisplayPirID` AS `id`,
       `dp`.`DisplayID`    AS `display_id`,
       `dp`.`TypeID`       AS `type_id`,
       `dp`.`ValidityID`   AS `validity_id`,
       `dp`.`VisitorPIR`   AS `visitor_pir`,
       `dp`.`ActionPIR`    AS `action_pir`,
       `dp`.`UploadedAt`   AS `uploaded_at`,
       `dp`.`ReceivedAt`   AS `received_at`
from `dispotronic_insta_test`.`displayspirs` `dp`);

create definer = root@localhost view datapine_events_pir as
(
select `e`.`id` AS `event_id`, cast(json_value(`ie`.`MetaData`, '$.pir') as signed) AS `pir`
from (`datapine`.`datapine_events` `e` join `dispotronic_insta_test`.`events` `ie` on (`ie`.`EventID` = `e`.`id`))
where `e`.`type_id` = 300703
  and json_exists(`ie`.`MetaData`, '$.pir'));

create definer = root@`192.168.168.%` view datapine_eventsimages as
(
select `ei`.`EventImageID` AS `id`, `ei`.`EventID` AS `event_id`, `ei`.`TypeID` AS `type_id`, `ei`.`ObjectTaskID` AS `object_task_id`, `ei`.`Comment` AS `comment`
from (`datapine`.`datapine_events` `e` join `dispotronic_insta_test`.`eventsimages` `ei` on (`ei`.`EventID` = `e`.`id`)));

create definer = root@`192.168.168.%` view datapine_frequencies as
(
select `f`.`FrequencyID` AS `id`, `t`.`Name` AS `type`, `f`.`CustomerID` AS `customer_id`, `f`.`Frequency` AS `frequency`, `f`.`MetaData` AS `metadata`
from (`dispotronic_insta_test`.`frequencies` `f` left join `dispotronic_insta_test`.`taxonomy` `t` on (`t`.`TaxonomyID` = `f`.`TypeID`)));

create definer = root@`192.168.168.%` view datapine_groups as
(
select `g`.`GroupID` AS `id`, `g`.`SubscriberID` AS `subscriber_id`, `g`.`GroupName` AS `group_name`, `g`.`Description` AS `description`
from `dispotronic_insta_test`.`groups` `g`);

create definer = root@`192.168.168.%` view datapine_inspections_buildings as
(
select `i`.`InspectionID` AS `inspection_id`, `b`.`BuildingID` AS `building_id`, `b`.`Name` AS `building_name`, `b`.`Address` AS `building_address`
from (((`dispotronic_insta_test`.`inspections` `i` join `dispotronic_insta_test`.`inspections_units` `iu` on (`iu`.`InspectionID` = `i`.`InspectionID`)) join `dispotronic_insta_test`.`buildings` `b` on (`b`.`BuildingID` = `iu`.`BuildingID`)) join `datapine`.`datapine_customers` `dc` on (`dc`.`id` = `b`.`CustomerID`))
where `i`.`StatusID` in (200203, 200204, 200205));

create definer = root@`192.168.168.%` view datapine_inspections_inspectors as
(
select `i`.`InspectionID` AS `inspection_id`, `u`.`UserID` AS `user_id`, `u`.`FirstName` AS `first_name`, `u`.`LastName` AS `last_name`
from ((((`dispotronic_insta_test`.`inspections` `i` join `dispotronic_insta_test`.`inspections_units` `iu` on (`iu`.`InspectionID` = `i`.`InspectionID`)) join `dispotronic_insta_test`.`feedbacks` `f` on (`f`.`InspectionUnitID` = `iu`.`InspectionUnitID`)) join `dispotronic_insta_test`.`users` `u` on (`u`.`UserID` = `f`.`UserID`)) join `datapine`.`datapine_customers` `dc`
      on (`dc`.`id` = `i`.`CustomerID`))
where `i`.`StatusID` in (200203, 200204, 200205)
group by `i`.`InspectionID`, `u`.`UserID`);

create definer = root@`192.168.168.%` view datapine_inspections_objectstasks as
(
select `i`.`InspectionID` AS `inspection_id`, `ot`.`ObjectTaskID` AS `object_task_id`
from ((`dispotronic_insta_test`.`inspections` `i` join `dispotronic_insta_test`.`inspections_objectstasks` `ot` on (`ot`.`InspectionID` = `i`.`InspectionID`)) join `datapine`.`datapine_customers` `dc` on (`dc`.`id` = `i`.`CustomerID`))
where `i`.`StatusID` in (200203, 200204, 200205));

create definer = root@`192.168.168.%` view datapine_inspections_units as
(
select `iu`.`InspectionUnitID`                                                                                                                                                    AS `id`,
       `iu`.`InspectionID`                                                                                                                                                        AS `inspection_id`,
       `iu`.`UnitID`                                                                                                                                                              AS `unit_id`,
       `iu`.`BuildingID`                                                                                                                                                          AS `building_id`,
       `if`.`Acceptance`                                                                                                                                                          AS `acceptance`,
       `hf`.`Acceptance`                                                                                                                                                          AS `acceptance_hygiene`,
       if(json_contains_path(ifnull(`if`.`MetaData`, '{}'), 'one', '$.achieved_percentage'), cast(json_extract(`if`.`MetaData`, '$.achieved_percentage') as decimal(5, 2)), NULL) AS `achieved_percentage`,
       `if`.`Comment`                                                                                                                                                             AS `comment`,
       `hf`.`Comment`                                                                                                                                                             AS `comment_hygiene`,
       `if`.`InvokedByTag`                                                                                                                                                        AS `invoked_by_tag`,
       `hf`.`InvokedByTag`                                                                                                                                                        AS `invoked_by_tag_hygiene`,
       `if`.`FeedbackDate`                                                                                                                                                        AS `started_at`,
       `if`.`FeedbackFinishDate`                                                                                                                                                  AS `finished_at`,
       `hf`.`FeedbackDate`                                                                                                                                                        AS `started_at_hygiene`,
       `hf`.`FeedbackFinishDate`                                                                                                                                                  AS `finished_at_hygiene`
from ((((`dispotronic_insta_test`.`inspections_units` `iu` join `dispotronic_insta_test`.`inspections` `i` on (`i`.`InspectionID` = `iu`.`InspectionID`)) join `datapine`.`datapine_customers` `dc` on (`dc`.`id` = `i`.`CustomerID`)) left join `dispotronic_insta_test`.`feedbacks` `if`
       on (`if`.`InspectionUnitID` = `iu`.`InspectionUnitID` and `if`.`TypeID` in (200301, 200303) and `if`.`ValidityID` = 200801)) left join `dispotronic_insta_test`.`feedbacks` `hf` on (`hf`.`InspectionUnitID` = `iu`.`InspectionUnitID` and `hf`.`TypeID` = 200302 and `hf`.`ValidityID` = 200801))
where `i`.`StatusID` in (200203, 200204, 200205));

create definer = root@`192.168.168.%` view datapine_inspections_units_objectstasks as
(
select `i`.`InspectionID` AS `inspection_id`, `iu`.`InspectionUnitID` AS `inspection_unit_id`, `ot`.`ObjectGroupID` AS `object_group_id`, `iuot`.`ObjectTaskID` AS `object_task_id`
from ((((`dispotronic_insta_test`.`inspections` `i` join `dispotronic_insta_test`.`inspections_units` `iu` on (`iu`.`InspectionID` = `i`.`InspectionID`)) join `dispotronic_insta_test`.`inspections_units_objectstasks` `iuot` on (`iuot`.`InspectionUnitID` = `iu`.`InspectionUnitID`)) join `dispotronic_insta_test`.`objectstasks` `ot`
       on (`ot`.`ObjectTaskID` = `iuot`.`ObjectTaskID`)) join `datapine`.`datapine_customers` `dc` on (`dc`.`id` = `i`.`CustomerID`))
where `i`.`StatusID` in (200203, 200204, 200205));

create definer = root@`192.168.168.%` view datapine_keyfigures as
(
select `kf`.`KeyFigureID`        AS `id`,
       `kf`.`CustomerID`         AS `customer_id`,
       `kf`.`Code`               AS `code`,
       `tq`.`Name`               AS `qprofile`,
       `hp`.`Code`               AS `hygiene_code`,
       `kf`.`PerformancePerHour` AS `perfomance`,
       `kf`.`Price`              AS `price`,
       `kf`.`PriceTypeID`        AS `price_type_id`,
       `kf`.`Penalty`            AS `penalty`,
       `kf`.`AdditionalPrice1`   AS `additional_price_1`,
       `kf`.`AdditionalPrice2`   AS `additional_price_2`,
       `kf`.`AdditionalPrice3`   AS `additional_price_3`,
       `kf`.`AdditionalPrice4`   AS `additional_price_4`,
       `kf`.`AdditionalPrice5`   AS `additional_price_5`,
       `kf`.`AdditionalPrice6`   AS `additional_price_6`,
       `kf`.`AdditionalPrice7`   AS `additional_price_7`,
       `kf`.`AdditionalPrice8`   AS `additional_price_8`,
       `kf`.`AdditionalPrice9`   AS `additional_price_9`,
       `kf`.`AdditionalPrice10`  AS `additional_price_10`,
       `kf`.`AdditionalPrice11`  AS `additional_price_11`,
       `kf`.`AdditionalPrice12`  AS `additional_price_12`
from ((`dispotronic_insta_test`.`keyfigures` `kf` left join `dispotronic_insta_test`.`taxonomy` `tq` on (`tq`.`TaxonomyID` = `kf`.`QualityProfileID`)) left join `dispotronic_insta_test`.`hygieneprofiles` `hp` on (`hp`.`HygieneProfileID` = `kf`.`HygieneProfileID`)));

create definer = root@`192.168.168.%` view datapine_objectsgroups as
(
select `og`.`ObjectGroupID` AS `id`, `og`.`CustomerID` AS `customer_id`, `t`.`Name` AS `status`, `og`.`GroupName` AS `group_name`, `og`.`Description` AS `description`
from (`dispotronic_insta_test`.`objectsgroups` `og` left join `dispotronic_insta_test`.`taxonomy` `t` on (`t`.`TaxonomyID` = `og`.`StatusID`)));

create definer = root@`192.168.168.%` view datapine_objectstasks as
(
select `ot`.`ObjectTaskID` AS `id`, `ot`.`ObjectGroupID` AS `object_group_id`, `t`.`Name` AS `status`, `ot`.`TaskName` AS `task_name`, `ot`.`Description` AS `description`, `ot`.`WeightPoints` AS `weight_points`, `ot`.`CountTypeID` AS `count_type_id`
from ((`dispotronic_insta_test`.`objectstasks` `ot` join `dispotronic_insta_test`.`objectsgroups` `og` on (`ot`.`ObjectGroupID` = `og`.`ObjectGroupID`)) left join `dispotronic_insta_test`.`taxonomy` `t` on (`t`.`TaxonomyID` = `ot`.`StatusID`)));

create definer = root@`192.168.168.%` view datapine_sensors as
(
select `s`.`SensorID` AS `id`, `s`.`CustomerID` AS `customer_id`, `s`.`UnitID` AS `unit_id`, `s`.`TypeID` AS `type_id`, `s`.`StatusID` AS `status_id`, `s`.`UID` AS `uid`, `s`.`Description` AS `description`
from `dispotronic_insta_test`.`sensors` `s`);

create definer = root@`192.168.168.%` view datapine_sensorsdata as
(
select `sd`.`SensorDataID` AS `id`, `sd`.`SensorID` AS `sensor_id`, `sd`.`UnitID` AS `unit_id`, `sd`.`Content` AS `content`, `sd`.`ReceivedAt` AS `received_at`, cast(`sd`.`ReceivedAt` as date) AS `received_date`
from `dispotronic_insta_test`.`sensorsdata` `sd`);

create definer = root@`192.168.168.%` view datapine_sensorsdata_distance as
(
select `sd`.`SensorDataID` AS `id`, `sd`.`SensorID` AS `sensor_id`, `sd`.`UnitID` AS `unit_id`, `sd`.`Distance` AS `distance`, `sd`.`ReceivedAt` AS `received_at`, cast(`sd`.`ReceivedAt` as date) AS `received_date`
from (`dispotronic_insta_test`.`sensors` `s` join `dispotronic_insta_test`.`sensorsdata` `sd` on (`sd`.`SensorID` = `s`.`SensorID`))
where `s`.`TypeID` = 500302);

create definer = root@`192.168.168.%` view datapine_sensorsdata_presence as
(
select `sd`.`SensorDataID` AS `id`, `sd`.`SensorID` AS `sensor_id`, `sd`.`UnitID` AS `unit_id`, cast(json_value(`sd`.`Content`, '$.moveCount') as signed) AS `count`, `sd`.`ReceivedAt` AS `received_at`, cast(`sd`.`ReceivedAt` as date) AS `received_date`
from (`dispotronic_insta_test`.`sensors` `s` join `dispotronic_insta_test`.`sensorsdata` `sd` on (`sd`.`SensorID` = `s`.`SensorID`))
where `s`.`TypeID` = 500301);

create definer = root@`192.168.168.%` view datapine_sensorsinfo as
(
select `sd`.`SensorInfoID` AS `id`, `sd`.`SensorID` AS `sensor_id`, `sd`.`Info` AS `info`, `sd`.`UpdatedAt` AS `updated_at`, `sd`.`LastActivityAt` AS `last_activity_at`
from `dispotronic_insta_test`.`sensorsinfo` `sd`);

create definer = root@`192.168.168.%` view datapine_units as
(
select `u`.`UnitID`            AS `id`,
       `u`.`BuildingID`        AS `building_id`,
       `u`.`StatusID`          AS `status_id`,
       `ts`.`Name`             AS `status`,
       `tus`.`Name`            AS `unit_size_id`,
       `tp`.`Name`             AS `qprofile`,
       `hp`.`Code`             AS `hygiene_code`,
       `u`.`RoomNumber`        AS `room_number`,
       `u`.`Description`       AS `description`,
       `u`.`Storey`            AS `storey`,
       `u`.`UnitSize`          AS `unit_size`,
       `u`.`UsedArea`          AS `used_area`,
       `u`.`TagID`             AS `tag_id`,
       `u`.`PlanID`            AS `plan_id`,
       `u`.`PlanCoordinates`   AS `plan_coordinates`,
       `u`.`CleaningFrequency` AS `cleaning_frequency`,
       `u`.`LastEventID`       AS `last_event_id`
from ((((`dispotronic_insta_test`.`units` `u` left join `dispotronic_insta_test`.`taxonomy` `ts` on (`ts`.`TaxonomyID` = `u`.`StatusID`)) left join `dispotronic_insta_test`.`taxonomy` `tus` on (`tus`.`TaxonomyID` = `u`.`UnitSizeID`)) left join `dispotronic_insta_test`.`taxonomy` `tp` on (`tp`.`TaxonomyID` = `u`.`QualityProfileID`)) left join `dispotronic_insta_test`.`hygieneprofiles` `hp`
      on (`hp`.`HygieneProfileID` = `u`.`HygieneProfileID`)));

create definer = root@`192.168.168.%` view datapine_units_attributes as
(
select `ua`.`AttributeID` AS `id`, `ua`.`UnitID` AS `unit_id`, `ua`.`Name` AS `name`, `ua`.`Value` AS `value`
from `dispotronic_insta_test`.`units_attributes` `ua`);

create definer = root@`192.168.168.%` view datapine_units_excludeddays as
(
select `ued`.`ExcludedDayID` AS `id`, `ued`.`UnitID` AS `unit_id`, `ued`.`ExcludedDay` AS `excluded_day`, `ued`.`Reason` AS `reason`
from (`dispotronic_insta_test`.`units_excludeddays` `ued` join `dispotronic_insta_test`.`units` `u` on (`u`.`UnitID` = `ued`.`UnitID`)));

create definer = root@`192.168.168.%` view datapine_units_keyfigures as
(
select `ukf`.`UnitKeyFigureID` AS `id`, `ukf`.`UnitID` AS `unit_id`, `ukf`.`KeyFigureID` AS `keyfigure_id`
from `dispotronic_insta_test`.`units_keyfigures` `ukf`);

create definer = root@`192.168.168.%` view datapine_units_objectsgroups as
(
select `uog`.`UnitObjectGroupID` AS `id`, `uog`.`UnitID` AS `unit_id`, `uog`.`ObjectGroupID` AS `object_group_id`, `uog`.`Inventory` AS `inventory`
from ((`dispotronic_insta_test`.`units_objectsgroups` `uog` join `dispotronic_insta_test`.`units` `u` on (`u`.`UnitID` = `uog`.`UnitID`)) join `dispotronic_insta_test`.`objectsgroups` `og` on (`og`.`ObjectGroupID` = `uog`.`ObjectGroupID`)));

create definer = root@`192.168.168.%` view datapine_units_objectstasks as
(
select `uot`.`UnitObjectTaskID` AS `id`, `uot`.`UnitObjectGroupID` AS `unit_object_group_id`, `uot`.`ObjectTaskID` AS `object_task_id`
from (`dispotronic_insta_test`.`units_objectstasks` `uot` join `dispotronic_insta_test`.`objectstasks` `ot` on (`ot`.`ObjectTaskID` = `uot`.`ObjectTaskID`)));

create definer = root@`192.168.168.%` view datapine_users as
(
select `u`.`UserID`           AS `id`,
       `u`.`StatusID`         AS `status_id`,
       `ts`.`Name`            AS `status`,
       `u`.`SubscriberID`     AS `subscriber_id`,
       `u`.`Login`            AS `login`,
       `u`.`FirstName`        AS `first_name`,
       `u`.`LastName`         AS `last_name`,
       `u`.`EmploymentNumber` AS `employment_number`,
       `u`.`CardNumber`       AS `card_number`
from (`dispotronic_insta_test`.`users` `u` left join `dispotronic_insta_test`.`taxonomy` `ts` on (`ts`.`TaxonomyID` = `u`.`StatusID`)));

create definer = root@`192.168.168.%` view datapine_users_groups as
(
select `ug`.`UserGroupID` AS `id`, `ug`.`UserID` AS `user_id`, `ug`.`GroupID` AS `group_id`
from (`dispotronic_insta_test`.`users_groups` `ug` join `dispotronic_insta_test`.`groups` `g` on (`g`.`GroupID` = `ug`.`GroupID`)));

create definer = root@`192.168.168.%` view datapine_users_roles as
(
select `ur`.`UserRoleID` AS `id`, `ur`.`UserID` AS `user_id`, `ur`.`RoleID` AS `role_id`
from `dispotronic_insta_test`.`users_roles` `ur`);

