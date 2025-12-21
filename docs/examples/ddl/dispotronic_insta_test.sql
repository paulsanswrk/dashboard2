create database dispotronic_insta_test;
use dispotronic_insta_test;

create table audits
(
    AuditID   int auto_increment
        primary key,
    TypeID    int                                   not null,
    UserID    int                                   not null,
    EntityID  int                                   not null,
    TableName varchar(255)                          not null,
    MetaData  mediumtext                            null,
    CreatedAt timestamp default current_timestamp() not null on update current_timestamp()
)
    collate = utf8mb4_swedish_ci;

create index CreatedAt
    on audits (CreatedAt);

create index EntityID
    on audits (TableName, EntityID);

create index TableName_CreatedAt_UserID
    on audits (TableName, CreatedAt, UserID);

create index TableName_EntityID_CreatedAt
    on audits (TableName, EntityID, CreatedAt);

create index TypeID
    on audits (TypeID);

create index UserID
    on audits (UserID);

create table currency
(
    CurrencyID int auto_increment
        primary key,
    Currency   varchar(255) not null
)
    collate = utf8mb4_swedish_ci;

create table taxonomy
(
    TaxonomyID int auto_increment
        primary key,
    Code       varchar(50)   not null,
    Name       varchar(50)   not null,
    ParentID   int           null,
    MetaData   mediumtext    null,
    Sorting    int default 0 not null,
    constraint taxonomy_fk_taxonomy
        foreign key (ParentID) references taxonomy (TaxonomyID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create table reports
(
    ReportID    int auto_increment
        primary key,
    TypeID      int          not null,
    Code        varchar(255) not null,
    Description varchar(255) not null,
    MetaData    mediumtext   not null,
    constraint reports_fk_taxonomy
        foreign key (TypeID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index TypeID
    on reports (TypeID);

create table subscribers
(
    SubscriberID        int auto_increment
        primary key,
    StatusID            int                not null,
    CurrencyID          int default 2      not null,
    SmartTagRenderID    int                null,
    MeasurementSystemID int default 500201 not null,
    Name                varchar(255)       not null,
    Description         varchar(255)       null,
    ResourcesDir        varchar(255)       null,
    TimeZone            varchar(255)       null,
    Logo                varchar(255)       null,
    OptionsMetaData     mediumtext         null,
    constraint subscribers_fk_currency
        foreign key (CurrencyID) references currency (CurrencyID)
            on update cascade,
    constraint `subscribers_fk_taxonomy (SmartTagRenderID)`
        foreign key (SmartTagRenderID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint subscribers_fk_taxonomy
        foreign key (StatusID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create table admincards
(
    AdminCardID  int auto_increment
        primary key,
    SubscriberID int          not null,
    CardNumber   varchar(255) not null,
    Description  varchar(255) null,
    constraint UniqueIndex
        unique (SubscriberID, CardNumber),
    constraint admincards_fk_subscribers
        foreign key (SubscriberID) references subscribers (SubscriberID)
            on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index SubscriberID
    on admincards (SubscriberID);

create table api_keys
(
    ApiKeyID     int auto_increment
        primary key,
    SubscriberID int          null,
    ApiKey       varchar(255) not null,
    constraint api_keys_fk_subscribers
        foreign key (SubscriberID) references subscribers (SubscriberID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create table customers
(
    CustomerID           int auto_increment
        primary key,
    SubscriberID         int          not null,
    StatusID             int          not null,
    Name                 varchar(255) not null,
    Description          mediumtext   null,
    ExternalFormMetaData mediumtext   null,
    DashboardLink        varchar(255) null,
    constraint customers_fk_subscribers
        foreign key (SubscriberID) references subscribers (SubscriberID)
            on update cascade on delete cascade,
    constraint customers_fk_taxonomy
        foreign key (StatusID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create table buildings
(
    BuildingID     int auto_increment
        primary key,
    CustomerID     int                        not null,
    StatusID       int                        not null,
    Name           varchar(255)               not null,
    Address        varchar(255)               not null,
    Latitude       decimal(10, 8)             null,
    Longitude      decimal(11, 8)             null,
    LocationRadius decimal(7, 2) default 0.00 not null,
    constraint buildings_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade on delete cascade,
    constraint buildings_fk_taxonomy
        foreign key (StatusID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index BuildingID_StatusID
    on buildings (BuildingID, StatusID);

create index CustomerID
    on buildings (CustomerID);

create index CustomerID_StatusID
    on buildings (CustomerID, StatusID);

create index StatusID
    on buildings (StatusID);

create table contacts
(
    ContactID   int auto_increment
        primary key,
    CustomerID  int          not null,
    StatusID    int          not null,
    Email       varchar(255) not null,
    Description varchar(255) null,
    constraint contacts_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade on delete cascade,
    constraint contacts_fk_taxonomy
        foreign key (StatusID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index CustomerID
    on contacts (CustomerID);

create index StatusID
    on contacts (StatusID);

create table contracts
(
    ContractID        int auto_increment
        primary key,
    CustomerID        int                       not null,
    StatusID          int                       not null,
    Name              varchar(255)              not null,
    Description       mediumtext                null,
    AQL               decimal(3, 1) default 4.0 not null,
    ProfilesMetaData  mediumtext                not null,
    TitlesMetaData    mediumtext                null,
    PremissesMetaData mediumtext                null,
    BeginDate         timestamp                 null,
    EndDate           timestamp                 null,
    constraint contracts_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade on delete cascade,
    constraint contracts_fk_taxonomy
        foreign key (StatusID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index CustomerID
    on contracts (CustomerID);

create index StatusID
    on contracts (StatusID);

create table contracts_buildings
(
    ContractBuildingID int auto_increment
        primary key,
    ContractID         int not null,
    BuildingID         int not null,
    constraint ContractID_BuildingID
        unique (ContractID, BuildingID),
    constraint contracts_buildings_fk_buildings
        foreign key (BuildingID) references buildings (BuildingID)
            on update cascade on delete cascade,
    constraint contracts_buildings_fk_contracts
        foreign key (ContractID) references contracts (ContractID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index BuildingID
    on contracts_buildings (BuildingID);

create index ContractID
    on contracts_buildings (ContractID);

create index StatusID
    on customers (StatusID);

create index SubscriberID
    on customers (SubscriberID);

create table customers_licenses
(
    CustomerLicenseID int auto_increment
        primary key,
    CustomerID        int not null,
    RoleID            int not null,
    Licenses          int not null,
    constraint UniqueKey
        unique (CustomerID, RoleID),
    constraint customers_licenses_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade on delete cascade,
    constraint customers_licenses_fk_taxonomy
        foreign key (RoleID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index CustomerID
    on customers_licenses (CustomerID);

create index RoleID
    on customers_licenses (RoleID);

create table entitiesgroups
(
    EntityGroupID int auto_increment
        primary key,
    CustomerID    int          not null,
    TypeID        int          not null,
    GroupName     varchar(255) not null,
    Description   varchar(255) null,
    constraint entitiesgroups_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade on delete cascade,
    constraint entitiesgroups_fk_taxonomy
        foreign key (TypeID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index CustomerID
    on entitiesgroups (CustomerID);

create index TypeID
    on entitiesgroups (TypeID);

create table frequencies
(
    FrequencyID int auto_increment
        primary key,
    TypeID      int           not null,
    CustomerID  int           not null,
    Frequency   decimal(7, 4) not null,
    MetaData    mediumtext    not null,
    constraint CustomerIDFrequency
        unique (CustomerID, Frequency),
    constraint frequencies_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade on delete cascade,
    constraint frequencies_fk_taxonomy
        foreign key (TypeID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index CustomerID
    on frequencies (CustomerID);

create index TypeID
    on frequencies (TypeID);

create table groups
(
    GroupID      int auto_increment
        primary key,
    SubscriberID int          not null,
    GroupName    varchar(255) not null,
    Description  varchar(255) null,
    constraint groups_fk_subscribers
        foreign key (SubscriberID) references subscribers (SubscriberID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index SubscriberID
    on groups (SubscriberID);

create table groups_buildings
(
    GroupBuildingID int auto_increment
        primary key,
    GroupID         int not null,
    BuildingID      int not null,
    constraint groups_buildings_fk_buildings
        foreign key (BuildingID) references buildings (BuildingID)
            on update cascade on delete cascade,
    constraint groups_buildings_fk_groups
        foreign key (GroupID) references groups (GroupID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index BuildingID
    on groups_buildings (BuildingID);

create index GroupID
    on groups_buildings (GroupID);

create table groups_customers
(
    GroupCustomerID int auto_increment
        primary key,
    GroupID         int not null,
    CustomerID      int not null,
    constraint groups_customers_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade on delete cascade,
    constraint groups_customers_fk_groups
        foreign key (GroupID) references groups (GroupID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index CustomerID
    on groups_customers (CustomerID);

create index GroupID
    on groups_customers (GroupID);

create table hygieneprofiles
(
    HygieneProfileID int auto_increment
        primary key,
    SubscriberID     int          null,
    Code             varchar(4)   not null,
    Description      varchar(255) not null,
    MetaData         mediumtext   not null,
    constraint HygieneCode
        unique (Code, SubscriberID),
    constraint hygieneprofiles_fk_subscribers
        foreign key (SubscriberID) references subscribers (SubscriberID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create table inspections
(
    InspectionID       int auto_increment
        primary key,
    ParentInspectionID int                       null,
    CustomerID         int                       not null,
    ContractID         int                       not null,
    StatusID           int                       not null,
    Name               varchar(255)              not null,
    AQL                decimal(3, 1) default 4.0 not null,
    Clustered          tinyint(1)    default 1   not null,
    InspectionTypeID   int                       not null,
    InspectionMethodID int                       not null,
    SamplingPlanID     int                       null,
    SamplingPercentage int           default 0   not null,
    OptionsMetaData    mediumtext                null,
    FiltersMetaData    longtext                  null,
    StrataMetaData     mediumtext                null,
    SamplingMetaData   mediumtext                null,
    PlannedDate        date                      null,
    AcPercentage       int           default 100 not null,
    WpPercentage       int           default 0   not null,
    CompletionHours    int           default 0   not null,
    SpentTime          int           default 0   not null,
    CompleteAt         datetime                  null,
    PreparedAt         datetime                  null,
    CompletedAt        datetime                  null,
    constraint inspections_fk_contracts
        foreign key (ContractID) references contracts (ContractID)
            on update cascade on delete cascade,
    constraint inspections_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade on delete cascade,
    constraint inspections_fk_inspections
        foreign key (ParentInspectionID) references inspections (InspectionID)
            on update cascade on delete set null,
    constraint `inspections_fk_taxonomy (InspectionMethodID)`
        foreign key (InspectionMethodID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `inspections_fk_taxonomy (InspectionTypeID)`
        foreign key (InspectionTypeID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `inspections_fk_taxonomy (SamplingPlanID)`
        foreign key (SamplingPlanID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `inspections_fk_taxonomy (StatusID)`
        foreign key (StatusID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index ContractID
    on inspections (ContractID);

create index CustomerID
    on inspections (CustomerID);

create index InspectionID_CustomerID_StatusID
    on inspections (InspectionID, CustomerID, StatusID);

create index InspectionMethodID
    on inspections (InspectionMethodID);

create index InspectionTypeID
    on inspections (InspectionTypeID);

create index ParentInspectionID
    on inspections (ParentInspectionID);

create index SamplingPlanID
    on inspections (SamplingPlanID);

create index StatusID
    on inspections (StatusID);

create table inspections_groups
(
    InspectionGroupID int auto_increment
        primary key,
    InspectionID      int not null,
    GroupID           int not null,
    constraint InspectionID_GroupID
        unique (InspectionID, GroupID),
    constraint inspections_groups_fk_
        foreign key (GroupID) references groups (GroupID)
            on update cascade on delete cascade,
    constraint inspections_groups_fk_inspections
        foreign key (InspectionID) references inspections (InspectionID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index GroupID
    on inspections_groups (GroupID);

create index InspectionID
    on inspections_groups (InspectionID);

create table inspections_reminders
(
    InspectionReminderID int auto_increment
        primary key,
    InspectionID         int           not null,
    Reminder             int default 0 not null,
    NotStartedHours      int default 0 not null,
    NotFinishedHours     int default 0 not null,
    Performed            int default 0 not null,
    constraint inspections_reminders_fk_inspections
        foreign key (InspectionID) references inspections (InspectionID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create table keyfigures
(
    KeyFigureID        int auto_increment
        primary key,
    CustomerID         int          not null,
    QualityProfileID   int          not null,
    HygieneProfileID   int          null,
    PriceTypeID        int          not null,
    Code               varchar(255) not null,
    PerformancePerHour int          null,
    Price              int          null,
    PriceWeekend       int          null,
    Penalty            int          null,
    AdditionalPrice1   int          null,
    AdditionalPrice2   int          null,
    AdditionalPrice3   int          null,
    AdditionalPrice4   int          null,
    AdditionalPrice5   int          null,
    AdditionalPrice6   int          null,
    AdditionalPrice7   int          null,
    AdditionalPrice8   int          null,
    AdditionalPrice9   int          null,
    AdditionalPrice10  int          null,
    AdditionalPrice11  int          null,
    AdditionalPrice12  int          null,
    constraint keyfigures_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade,
    constraint keyfigures_fk_hygieneprofiles
        foreign key (HygieneProfileID) references hygieneprofiles (HygieneProfileID)
            on update cascade,
    constraint `keyfigures_fk_taxonomy (PriceTypeID)`
        foreign key (PriceTypeID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `keyfigures_fk_taxonomy (QualityProfileID)`
        foreign key (QualityProfileID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index Code
    on keyfigures (Code);

create index CustomerID
    on keyfigures (CustomerID);

create index HygieneProfileID
    on keyfigures (HygieneProfileID);

create index PriceTypeID
    on keyfigures (PriceTypeID);

create index QualityProfileID
    on keyfigures (QualityProfileID);

create table notifications
(
    NotificationID   int auto_increment
        primary key,
    CustomerID       int                       not null,
    TriggerTypeID    int                       not null,
    TriggerSourceID  int                       not null,
    StatusID         int                       not null,
    Target           int          default 1    not null,
    NotificationName varchar(255)              not null,
    Description      varchar(255)              null,
    EmailSubject     varchar(255)              null,
    WorkorderComment mediumtext                null,
    OptionsMetaData  mediumtext                null,
    Language         varchar(255) default 'en' not null,
    constraint notifications_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade on delete cascade,
    constraint `notifications_fk_taxonomy (StatusID)`
        foreign key (StatusID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `notifications_fk_taxonomy (TriggerSourceID)`
        foreign key (TriggerSourceID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `notifications_fk_taxonomy (TriggerTypeID)`
        foreign key (TriggerTypeID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index CustomerID
    on notifications (CustomerID);

create index StatusID
    on notifications (StatusID);

create index TriggerSourceID
    on notifications (TriggerSourceID);

create index TriggerTypeID
    on notifications (TriggerTypeID);

create table notifications_contacts
(
    NotificationContactID int auto_increment
        primary key,
    NotificationID        int not null,
    ContactID             int not null,
    constraint notifications_contacts_fk_contacts
        foreign key (ContactID) references contacts (ContactID)
            on update cascade on delete cascade,
    constraint notifications_contacts_fk_notifications
        foreign key (NotificationID) references notifications (NotificationID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index ContactID
    on notifications_contacts (ContactID);

create index NotificationID
    on notifications_contacts (NotificationID);

create table notifications_contracts
(
    NotificationContractID int auto_increment
        primary key,
    NotificationID         int not null,
    ContractID             int not null,
    constraint notifications_contracts_fk_contracts
        foreign key (ContractID) references contracts (ContractID)
            on update cascade on delete cascade,
    constraint notifications_contracts_fk_notifications
        foreign key (NotificationID) references notifications (NotificationID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index ContractID
    on notifications_contracts (ContractID);

create index NotificationID
    on notifications_contracts (NotificationID);

create table notifications_entitiesgroups
(
    NotificationEntityGroupID int auto_increment
        primary key,
    NotificationID            int not null,
    EntityGroupID             int not null,
    constraint notifications_entitiesgroups_fk_entitiesgroups
        foreign key (EntityGroupID) references entitiesgroups (EntityGroupID)
            on update cascade on delete cascade,
    constraint notifications_entitiesgroups_fk_notifications
        foreign key (NotificationID) references notifications (NotificationID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index EntityGroupID
    on notifications_entitiesgroups (EntityGroupID);

create index NotificationID
    on notifications_entitiesgroups (NotificationID);

create table notifications_groups
(
    NotificationGroupID int auto_increment
        primary key,
    NotificationID      int not null,
    GroupID             int not null,
    constraint NotificationID_GroupID
        unique (NotificationID, GroupID),
    constraint notifications_groups_fk_
        foreign key (GroupID) references groups (GroupID)
            on update cascade on delete cascade,
    constraint notifications_groups_fk_notifications
        foreign key (NotificationID) references notifications (NotificationID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index GroupID
    on notifications_groups (GroupID);

create index NotificationID
    on notifications_groups (NotificationID);

create table objectsgroups
(
    ObjectGroupID int auto_increment
        primary key,
    CustomerID    int          not null,
    StatusID      int          not null,
    GroupName     varchar(255) not null,
    Description   varchar(255) null,
    constraint objectsgroups_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade on delete cascade,
    constraint objectsgroups_fk_taxonomy
        foreign key (StatusID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create table groups_objectsgroups
(
    GroupObjectGroupID int auto_increment
        primary key,
    GroupID            int not null,
    ObjectGroupID      int not null,
    constraint groups_objectsgroups_fk_groups
        foreign key (GroupID) references groups (GroupID)
            on update cascade on delete cascade,
    constraint groups_objectsgroups_fk_objectsgroups
        foreign key (ObjectGroupID) references objectsgroups (ObjectGroupID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index GroupID
    on groups_objectsgroups (GroupID);

create index ObjectGroupID
    on groups_objectsgroups (ObjectGroupID);

create index CustomerID
    on objectsgroups (CustomerID);

create index StatusID
    on objectsgroups (StatusID);

create table objectstasks
(
    ObjectTaskID  int auto_increment
        primary key,
    ObjectGroupID int                not null,
    TypeID        int default 300501 not null,
    StatusID      int                not null,
    TaskName      varchar(255)       not null,
    Description   mediumtext         null,
    WeightPoints  int default 0      not null,
    CountTypeID   int default 400601 not null,
    IsEventTask   int default 0      not null,
    constraint objectstasks_fk_objectsgroups
        foreign key (ObjectGroupID) references objectsgroups (ObjectGroupID)
            on update cascade on delete cascade,
    constraint `objectstasks_fk_taxonomy (CountTypeID)`
        foreign key (CountTypeID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `objectstasks_fk_taxonomy (StatusID)`
        foreign key (StatusID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `objectstasks_fk_taxonomy (TypeID)`
        foreign key (TypeID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create table inspections_objectstasks
(
    InspectionObjectTaskID int auto_increment
        primary key,
    InspectionID           int                not null,
    ObjectTaskID           int                not null,
    WeightPoints           int default 0      not null,
    CountTypeID            int default 400601 not null,
    constraint inspections_objectstasks_fk_inspections
        foreign key (InspectionID) references inspections (InspectionID)
            on update cascade on delete cascade,
    constraint inspections_objectstasks_fk_objectstasks
        foreign key (ObjectTaskID) references objectstasks (ObjectTaskID)
            on update cascade on delete cascade,
    constraint inspections_objectstasks_fk_taxonomy
        foreign key (CountTypeID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index CountTypeID
    on inspections_objectstasks (CountTypeID);

create index InspectionID
    on inspections_objectstasks (InspectionID);

create index ObjectTaskID
    on inspections_objectstasks (ObjectTaskID);

create table notifications_objectstasks
(
    NotificationObjectTaskID int auto_increment
        primary key,
    NotificationID           int not null,
    ObjectTaskID             int not null,
    constraint notifications_objectstasks_fk_notifications
        foreign key (NotificationID) references notifications (NotificationID)
            on update cascade on delete cascade,
    constraint notifications_objectstasks_fk_objectstasks
        foreign key (ObjectTaskID) references objectstasks (ObjectTaskID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index NotificationID
    on notifications_objectstasks (NotificationID);

create index ObjectTaskID
    on notifications_objectstasks (ObjectTaskID);

create index CountTypeID
    on objectstasks (CountTypeID);

create index ObjectGroupID
    on objectstasks (ObjectGroupID);

create index ObjectTaskID_ObjectGroupID
    on objectstasks (ObjectTaskID, ObjectGroupID);

create index StatusID
    on objectstasks (StatusID);

create index TypeID
    on objectstasks (TypeID);

create table plans
(
    PlanID     int auto_increment
        primary key,
    BuildingID int           not null,
    FileName   varchar(255)  not null,
    PlanName   varchar(255)  not null,
    PlanHeight int default 0 not null,
    PlanWidth  int default 0 not null,
    NorthAngle int default 0 not null,
    constraint plans_fk_buildings
        foreign key (BuildingID) references buildings (BuildingID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index BuildingID
    on plans (BuildingID);

create table predefinedcomments
(
    PredefinedCommentID int auto_increment
        primary key,
    CustomerID          int           not null,
    TypeID              int           not null,
    StatusID            int           not null,
    Comment             mediumtext    not null,
    IsEditable          int default 1 not null,
    constraint predefinedcomments_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade on delete cascade,
    constraint `predefinedcomments_fk_taxonomy (StatusID)`
        foreign key (StatusID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `predefinedcomments_fk_taxonomy (TypeID)`
        foreign key (TypeID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index CustomerID
    on predefinedcomments (CustomerID);

create index StatusID
    on predefinedcomments (StatusID);

create index TypeID
    on predefinedcomments (TypeID);

create table schedules
(
    ScheduleID        int auto_increment
        primary key,
    InspectionID      int                               not null,
    TypeID            int                               not null,
    StatusID          int                               not null,
    MetaData          mediumtext                        null,
    Language          varchar(255) default 'en'         not null,
    StartDate         date         default '0000-00-00' not null,
    NextEffectiveDate date         default '0000-00-00' not null,
    constraint schedules_fk_inspections
        foreign key (InspectionID) references inspections (InspectionID)
            on update cascade on delete cascade,
    constraint `schedules_fk_taxonomy (StatusID)`
        foreign key (StatusID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `schedules_fk_taxonomy (TypeID)`
        foreign key (TypeID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index InspectionID
    on schedules (InspectionID);

create index NextEffectiveDate
    on schedules (NextEffectiveDate);

create index StatusID
    on schedules (StatusID);

create index TypeID
    on schedules (TypeID);

create table styles
(
    StyleID       int auto_increment
        primary key,
    SubscriberID  int        not null,
    StyleMetaData mediumtext not null,
    constraint styles_fk_subscribers
        foreign key (SubscriberID) references subscribers (SubscriberID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index SubscriberID
    on styles (SubscriberID);

create index CurrencyID
    on subscribers (CurrencyID);

create index SmartTagRenderID
    on subscribers (SmartTagRenderID);

create index StatusID
    on subscribers (StatusID);

create index SubscriberID_StatusID
    on subscribers (SubscriberID, StatusID);

create index ParentID
    on taxonomy (ParentID);

create index Sorting
    on taxonomy (Sorting);

create table tools
(
    ToolID     int auto_increment
        primary key,
    CustomerID int        not null,
    ToolTypeID int        not null,
    MetaData   mediumtext null,
    constraint UniqueKey
        unique (ToolTypeID, CustomerID),
    constraint tools_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade on delete cascade,
    constraint tools_fk_taxonomy
        foreign key (ToolTypeID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index CustomerID
    on tools (CustomerID);

create index ToolTypeID
    on tools (ToolTypeID);

create table users
(
    UserID            int auto_increment
        primary key,
    StatusID          int          not null,
    SubscriberID      int          null,
    Login             varchar(255) not null,
    Password          varchar(255) null,
    FirstName         varchar(255) not null,
    LastName          varchar(255) not null,
    EmploymentNumber  varchar(255) null,
    CardNumber        varchar(255) null,
    Agreement         varchar(255) null,
    LicenseAcceptedAt datetime     null,
    OptionsMetaData   mediumtext   null,
    constraint users_fk_subscribers
        foreign key (SubscriberID) references subscribers (SubscriberID)
            on update cascade on delete cascade,
    constraint users_fk_taxonomy
        foreign key (StatusID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create table events
(
    EventID         int auto_increment
        primary key,
    TypeID          int       default 300701                not null,
    UserID          int                                     not null,
    UnitID          int                                     not null,
    ContractID      int                                     null,
    ValidityID      int                                     not null,
    Comment         mediumtext                              null,
    MetaData        mediumtext                              null,
    EventDate       timestamp default '0000-00-00 00:00:00' not null,
    EventFinishDate timestamp                               null,
    constraint events_fk_contracts
        foreign key (ContractID) references contracts (ContractID)
            on update cascade,
    constraint `events_fk_taxonomy (TypeID)`
        foreign key (TypeID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `events_fk_taxonomy (ValidityID)`
        foreign key (ValidityID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint events_fk_users
        foreign key (UserID) references users (UserID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index ContractID
    on events (ContractID);

create index EventDate
    on events (EventDate);

create index EventFinishDate
    on events (EventFinishDate);

create index TypeID
    on events (TypeID);

create index TypeID_EventDate_UnitID
    on events (TypeID, EventDate, UnitID);

create index TypeID_EventDate_UserID
    on events (TypeID, EventDate, UserID);

create index UnitID
    on events (UnitID);

create index UnitID_UserID_EventDate
    on events (UnitID, UserID, EventDate);

create index UnitID_ValidityID
    on events (UnitID, ValidityID);

create index UserID
    on events (UserID);

create index ValidityID
    on events (ValidityID);

create table eventsimages
(
    EventImageID int auto_increment
        primary key,
    EventID      int                not null,
    TypeID       int default 300201 not null,
    ObjectTaskID int                null,
    FileName     varchar(255)       not null,
    Comment      mediumtext         null,
    constraint eventsimages_fk_events
        foreign key (EventID) references events (EventID)
            on update cascade on delete cascade,
    constraint eventsimages_fk_taxonomy
        foreign key (TypeID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index EventID
    on eventsimages (EventID);

create table eventspositions
(
    EventPositionID int auto_increment
        primary key,
    EventID         int                                     not null,
    Latitude        decimal(10, 8)                          not null,
    Longitude       decimal(11, 8)                          not null,
    TrackedAt       timestamp default '0000-00-00 00:00:00' not null,
    RawDate         timestamp                               null,
    constraint eventspositions_fk_events
        foreign key (EventID) references events (EventID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index EventID
    on eventspositions (EventID);

create table fcmtokens
(
    FCMTokenID   int auto_increment
        primary key,
    UserID       int                                     not null,
    DeviceTypeID int                                     not null,
    Token        varchar(255)                            not null,
    UpdatedAt    timestamp default '0000-00-00 00:00:00' not null,
    constraint tokens_fk_taxonomy
        foreign key (DeviceTypeID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint tokens_fk_users
        foreign key (UserID) references users (UserID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index DeviceTypeID
    on fcmtokens (DeviceTypeID);

create index Token
    on fcmtokens (Token);

create index UserID
    on fcmtokens (UserID);

create table filters
(
    FilterID       int auto_increment
        primary key,
    CustomerID     int           null,
    UserID         int           not null,
    FilterTypeID   int           not null,
    FilterName     varchar(255)  not null,
    FilterMetaData longtext      not null,
    IsDefault      int default 0 not null,
    constraint filters_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade on delete cascade,
    constraint filters_fk_taxonomy
        foreign key (FilterTypeID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint filters_fk_users
        foreign key (UserID) references users (UserID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index CustomerID
    on filters (CustomerID);

create index FilterTypeID
    on filters (FilterTypeID);

create index UserID
    on filters (UserID);

create table inspections_users
(
    InspectionUserID int auto_increment
        primary key,
    InspectionID     int not null,
    UserID           int not null,
    constraint inspections_users_fk_inspections
        foreign key (InspectionID) references inspections (InspectionID)
            on update cascade on delete cascade,
    constraint inspections_users_fk_users
        foreign key (UserID) references users (UserID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index InspectionID
    on inspections_users (InspectionID);

create index UserID
    on inspections_users (UserID);

create table notifications_users
(
    NotificationUserID int auto_increment
        primary key,
    NotificationID     int not null,
    UserID             int not null,
    constraint notifications_users_fk_inspections
        foreign key (NotificationID) references notifications (NotificationID)
            on update cascade on delete cascade,
    constraint notifications_users_fk_users
        foreign key (UserID) references users (UserID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index NotificationID
    on notifications_users (NotificationID);

create index UserID
    on notifications_users (UserID);

create table units
(
    UnitID            int auto_increment
        primary key,
    BuildingID        int           not null,
    StatusID          int           not null,
    UnitSizeID        int           not null,
    QualityProfileID  int           not null,
    HygieneProfileID  int           null,
    RoomNumber        varchar(255)  not null,
    Description       varchar(255)  not null,
    Storey            varchar(255)  not null,
    UnitSize          decimal(9, 2) not null,
    UsedArea          int           null,
    TagID             varchar(20)   null,
    PlanID            int           null,
    PlanCoordinates   mediumtext    null,
    CleaningFrequency decimal(7, 4) null,
    LastEventID       int           null,
    constraint units_fk_buildings
        foreign key (BuildingID) references buildings (BuildingID)
            on update cascade on delete cascade,
    constraint units_fk_events
        foreign key (LastEventID) references events (EventID)
            on update cascade on delete set null,
    constraint units_fk_hygieneprofiles
        foreign key (HygieneProfileID) references hygieneprofiles (HygieneProfileID)
            on update cascade,
    constraint units_fk_plans
        foreign key (PlanID) references plans (PlanID)
            on update cascade on delete set null,
    constraint `units_fk_taxonomy (QualityProfileID)`
        foreign key (QualityProfileID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `units_fk_taxonomy (StatusID)`
        foreign key (StatusID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `units_fk_taxonomy (UnitSizeID)`
        foreign key (UnitSizeID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create table displays
(
    DisplayID      int auto_increment
        primary key,
    CustomerID     int                not null,
    UnitID         int                null,
    TypeID         int                not null,
    StatusID       int default 100501 not null,
    BatteryTypeID  int default 500101 not null,
    UID            varchar(255)       not null,
    Description    varchar(255)       null,
    Info           varchar(255)       null,
    PIR            int default 0      not null,
    ConfigMetaData mediumtext         not null,
    constraint UID
        unique (UID, CustomerID),
    constraint UnitID
        unique (UnitID),
    constraint displays_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade on delete cascade,
    constraint `displays_fk_taxonomy (BatteryTypeID)`
        foreign key (BatteryTypeID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `displays_fk_taxonomy (StatusID)`
        foreign key (StatusID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint displays_fk_taxonomy
        foreign key (TypeID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint displays_fk_units
        foreign key (UnitID) references units (UnitID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index BatteryTypeID
    on displays (BatteryTypeID);

create index CustomerID
    on displays (CustomerID);

create index StatusID
    on displays (StatusID);

create index TypeID
    on displays (TypeID);

create table displaysinfo
(
    DisplayInfoID     int auto_increment
        primary key,
    DisplayID         int             not null,
    BatteryLevel      int default 100 not null,
    SignalStrength    int default 100 not null,
    VisitorPIR        int default 0   not null,
    ActionPIR         int default 0   not null,
    Firmware          varchar(255)    null,
    ConfiguredAt      timestamp       null,
    UploadedAt        timestamp       null,
    ReceivedAt        timestamp       null,
    BatteryReplacedAt timestamp       null,
    BatteryNotifiedAt timestamp       null,
    SignalNotifiedAt  timestamp       null,
    constraint DisplayID
        unique (DisplayID),
    constraint displaysinfo_fk_displays
        foreign key (DisplayID) references displays (DisplayID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create table displayspirs
(
    DisplayPirID int auto_increment
        primary key,
    DisplayID    int                                     not null,
    TypeID       int       default 400901                not null,
    ValidityID   int       default 200801                not null,
    VisitorPIR   int       default 0                     not null,
    ActionPIR    int       default 0                     not null,
    UploadedAt   timestamp default '0000-00-00 00:00:00' not null,
    ReceivedAt   timestamp default '0000-00-00 00:00:00' not null,
    constraint displayspirs_fk_displays
        foreign key (DisplayID) references displays (DisplayID)
            on update cascade on delete cascade,
    constraint `displayspirs_fk_taxonomy (TypeID)`
        foreign key (TypeID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `displayspirs_fk_taxonomy (ValidityID)`
        foreign key (ValidityID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index ActionPIR
    on displayspirs (ActionPIR);

create index DisplayID
    on displayspirs (DisplayID);

create index DisplayID_TypeID_VisitorPir
    on displayspirs (DisplayID, TypeID, VisitorPIR);

create index DisplayID_ValidityID
    on displayspirs (DisplayID, ValidityID);

create index DisplayID_ValidityID_UploadedAt
    on displayspirs (DisplayID, ValidityID, UploadedAt);

create index ReceivedAt
    on displayspirs (ReceivedAt);

create index TypeID
    on displayspirs (TypeID);

create index TypeID_UploadedAt
    on displayspirs (TypeID, UploadedAt);

create index UploadedAt
    on displayspirs (UploadedAt);

create index ValidityID
    on displayspirs (ValidityID);

create table displaysraw
(
    DisplayRawID int auto_increment
        primary key,
    DisplayID    int(255)                                not null,
    UserID       varchar(255)                            null,
    StartDate    varchar(255)                            null,
    FinishDate   varchar(255)                            null,
    PIR          varchar(255)                            null,
    ReceivedAt   timestamp default '0000-00-00 00:00:00' not null,
    constraint displaysraw_fk_displays
        foreign key (DisplayID) references displays (DisplayID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index DisplayID
    on displaysraw (DisplayID);

alter table events
    add constraint events_fk_units
        foreign key (UnitID) references units (UnitID)
            on update cascade on delete cascade;

create table idunmap
(
    IdunMapID     int auto_increment
        primary key,
    DisplayID     int          not null,
    IdunDeviceID  varchar(255) not null,
    IdunDeviceKey varchar(255) not null,
    IdunSensorID  varchar(255) not null,
    constraint idunmap_fk_displays
        foreign key (DisplayID) references displays (DisplayID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index DisplayID
    on idunmap (DisplayID);

create table inspections_units
(
    InspectionUnitID int auto_increment
        primary key,
    InspectionID     int           not null,
    UnitID           int           not null,
    BuildingID       int           not null,
    UnitSizeID       int           not null,
    QualityProfileID int           not null,
    HygieneProfileID int           null,
    RoomNumber       varchar(255)  not null,
    Description      varchar(255)  not null,
    Storey           varchar(255)  not null,
    UnitSize         decimal(9, 2) not null,
    constraint inspections_units_fk_buildings
        foreign key (BuildingID) references buildings (BuildingID)
            on update cascade on delete cascade,
    constraint inspections_units_fk_inspections
        foreign key (InspectionID) references inspections (InspectionID)
            on update cascade on delete cascade,
    constraint `inspections_units_fk_taxonomy (HygieneProfileID)`
        foreign key (HygieneProfileID) references hygieneprofiles (HygieneProfileID)
            on update cascade,
    constraint `inspections_units_fk_taxonomy (QualityProfileID)`
        foreign key (QualityProfileID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `inspections_units_fk_taxonomy (UnitSizeID)`
        foreign key (UnitSizeID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint inspections_units_fk_units
        foreign key (UnitID) references units (UnitID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create table feedbacks
(
    FeedbackID         int auto_increment
        primary key,
    InspectionUnitID   int                                      not null,
    UserID             int                                      not null,
    TypeID             int                                      not null,
    ValidityID         int        default 200801                not null,
    Comment            mediumtext                               null,
    MetaData           mediumtext                               not null,
    Acceptance         tinyint(1) default 0                     not null,
    InvokedByTag       tinyint(1) default 0                     not null,
    FeedbackDate       timestamp  default '0000-00-00 00:00:00' not null,
    FeedbackFinishDate timestamp                                null,
    CorrectionDate     timestamp                                null,
    constraint feedbacks_fk_inspections_units
        foreign key (InspectionUnitID) references inspections_units (InspectionUnitID)
            on update cascade on delete cascade,
    constraint `feedbacks_fk_taxonomy (TypeID)`
        foreign key (TypeID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `feedbacks_fk_taxonomy (ValidityID)`
        foreign key (ValidityID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint feedbacks_fk_users
        foreign key (UserID) references users (UserID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index InspectionUnitID
    on feedbacks (InspectionUnitID);

create index `InspectionUnitID, UserID`
    on feedbacks (InspectionUnitID, UserID);

create index InspectionUnitID_ValidityID_TypeID
    on feedbacks (InspectionUnitID, ValidityID, TypeID);

create index TypeID
    on feedbacks (TypeID);

create index UserID
    on feedbacks (UserID);

create index ValidityID
    on feedbacks (ValidityID);

create index ValidityID_TypeID
    on feedbacks (ValidityID, TypeID);

create table feedbacksimages
(
    FeedbackImageID int auto_increment
        primary key,
    FeedbackID      int                not null,
    TypeID          int default 300201 not null,
    ObjectTaskID    int                null,
    FileName        varchar(255)       not null,
    Comment         mediumtext         null,
    constraint feedbacksimages_fk_feedbacks
        foreign key (FeedbackID) references feedbacks (FeedbackID)
            on update cascade on delete cascade,
    constraint feedbacksimages_fk_objects_tasks
        foreign key (ObjectTaskID) references objectstasks (ObjectTaskID)
            on update cascade,
    constraint feedbacksimages_fk_taxonomy
        foreign key (TypeID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index FeedbackID
    on feedbacksimages (FeedbackID);

create index ObjectTaskID
    on feedbacksimages (ObjectTaskID);

create index TypeID
    on feedbacksimages (TypeID);

create index BuildingID
    on inspections_units (BuildingID);

create index HygieneProfileID
    on inspections_units (HygieneProfileID);

create index InspectionID
    on inspections_units (InspectionID);

create index InspectionID_BuildingID
    on inspections_units (InspectionID, BuildingID);

create index QualityProfileID
    on inspections_units (QualityProfileID);

create index UnitID
    on inspections_units (UnitID);

create index UnitSizeID
    on inspections_units (UnitSizeID);

create table inspections_units_objectstasks
(
    InspectionUnitObjectTaskID int auto_increment
        primary key,
    InspectionUnitID           int not null,
    ObjectTaskID               int not null,
    constraint inspections_units_objectstasks_fk_inspections_units
        foreign key (InspectionUnitID) references inspections_units (InspectionUnitID)
            on update cascade on delete cascade,
    constraint inspections_units_objectstasks_fk_objectstasks
        foreign key (ObjectTaskID) references objectstasks (ObjectTaskID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index InspectionUnitID
    on inspections_units_objectstasks (InspectionUnitID);

create index ObjectTaskID
    on inspections_units_objectstasks (ObjectTaskID);

create table notifications_displays
(
    NotificationDisplayID int auto_increment
        primary key,
    NotificationID        int not null,
    DisplayID             int not null,
    constraint UniqueueIndex
        unique (NotificationID, DisplayID),
    constraint notifications_displays_fk_displays
        foreign key (DisplayID) references displays (DisplayID)
            on update cascade on delete cascade,
    constraint notifications_displays_fk_notifications
        foreign key (NotificationID) references notifications (NotificationID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index DisplayID
    on notifications_displays (DisplayID);

create index NotificationID
    on notifications_displays (NotificationID);

create table replacements
(
    ReplacementID     int auto_increment
        primary key,
    InspectionID      int                                    not null,
    UserID            int                                    not null,
    UnitID            int                                    not null,
    ReplacementUnitID int                                    not null,
    ReplacementDate   datetime default '0000-00-00 00:00:00' not null,
    constraint replacements_fk_inspections
        foreign key (InspectionID) references inspections (InspectionID)
            on update cascade on delete cascade,
    constraint `replacements_fk_units (ReplacementUnitID)`
        foreign key (ReplacementUnitID) references units (UnitID)
            on update cascade on delete cascade,
    constraint `replacements_fk_units (UnitID)`
        foreign key (UnitID) references units (UnitID)
            on update cascade on delete cascade,
    constraint replacements_fk_users
        foreign key (UserID) references users (UserID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index InspectionID
    on replacements (InspectionID);

create index ReplacementUnitID
    on replacements (ReplacementUnitID);

create index UnitID
    on replacements (UnitID);

create index UserID
    on replacements (UserID);

create table sensors
(
    SensorID       int auto_increment
        primary key,
    CustomerID     int                not null,
    UnitID         int                null,
    ManufacturerID int default 500701 not null,
    TypeID         int                not null,
    StatusID       int default 100501 not null,
    UID            varchar(255)       not null,
    Description    varchar(255)       null,
    MetaData       mediumtext         not null,
    constraint UID
        unique (UID, CustomerID),
    constraint sensors_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade on delete cascade,
    constraint `sensors_fk_taxonomy (StatusID)`
        foreign key (StatusID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `sensors_fk_taxonomy (manufacturer_id)`
        foreign key (ManufacturerID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint sensors_fk_taxonomy
        foreign key (TypeID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint sensors_fk_units
        foreign key (UnitID) references units (UnitID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create table entitiesgroups_sensors
(
    EntityGroupSensorID int auto_increment
        primary key,
    EntityGroupID       int not null,
    SensorID            int not null,
    VirtualGroupID      int null,
    constraint entitiesgroups_entititesgroups
        foreign key (EntityGroupID) references entitiesgroups (EntityGroupID)
            on update cascade on delete cascade,
    constraint entitiesgroups_sensor_fk_sensors
        foreign key (SensorID) references sensors (SensorID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index EntityGroupID
    on entitiesgroups_sensors (EntityGroupID);

create index SensorID
    on entitiesgroups_sensors (SensorID);

create table notifications_sensors
(
    NotificationSensorID int auto_increment
        primary key,
    NotificationID       int not null,
    SensorID             int not null,
    constraint UniqueueKey
        unique (NotificationID, SensorID),
    constraint notifications_sensors_fk_notifications
        foreign key (NotificationID) references notifications (NotificationID)
            on update cascade on delete cascade,
    constraint notifications_sensors_fk_sensors
        foreign key (SensorID) references sensors (SensorID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index NotificationID
    on notifications_sensors (NotificationID);

create index SensorID
    on notifications_sensors (SensorID);

create index CustomerID
    on sensors (CustomerID);

create index ManufacturerID
    on sensors (ManufacturerID);

create index SensorID_TypeID
    on sensors (SensorID, TypeID);

create index StatusID
    on sensors (StatusID);

create index TypeID
    on sensors (TypeID);

create index UnitID
    on sensors (UnitID);

create table sensorsdata
(
    SensorDataID int auto_increment
        primary key,
    SensorID     int                                     not null,
    UnitID       int                                     not null,
    Content      text                                    not null,
    ReceivedAt   timestamp default '0000-00-00 00:00:00' not null,
    Distance     int as (cast(json_value(`Content`, '$.dist') as signed)) stored,
    Count        int as (if(json_contains_path(`Content`, 'one', '$.moveCount'),
                            cast(json_value(`Content`, '$.moveCount') as signed),
                            if(json_contains_path(`Content`, 'one', '$.count'),
                               cast(json_value(`Content`, '$.count') as signed),
                               cast(json_value(`Content`, '$.in') as signed)))) stored,
    constraint sensorsdata_fk_sensors
        foreign key (SensorID) references sensors (SensorID)
            on update cascade on delete cascade,
    constraint sensorsdata_fk_units
        foreign key (UnitID) references units (UnitID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index SensorID
    on sensorsdata (SensorID);

create index SensorID_Count_ReceivedAt
    on sensorsdata (SensorID, Count, ReceivedAt);

create index SensorID_Distance_ReceivedAt
    on sensorsdata (SensorID, Distance, ReceivedAt);

create index SensorID_ReceivedAt
    on sensorsdata (SensorID, ReceivedAt);

create index SensorID_ReceivedAtDesc_Distance
    on sensorsdata (SensorID asc, ReceivedAt desc, Distance asc);

create index SensorID_UnitID
    on sensorsdata (SensorID, UnitID);

create index UnitID
    on sensorsdata (UnitID);

create table sensorsinfo
(
    SensorInfoID   int auto_increment
        primary key,
    SensorID       int                                     not null,
    LevelStateID   int       default 500501                not null,
    Info           text                                    not null,
    UpdatedAt      timestamp                               null,
    LastActivityAt timestamp default '0000-00-00 00:00:00' not null,
    constraint SensorID
        unique (SensorID),
    constraint sensorsinfo_fk_sensors
        foreign key (SensorID) references sensors (SensorID)
            on update cascade on delete cascade,
    constraint sensorsinfo_fk_taxonomy
        foreign key (LevelStateID) references taxonomy (TaxonomyID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index LevelStateID
    on sensorsinfo (LevelStateID);

create table sentnotifications
(
    SentNotificationID int auto_increment
        primary key,
    NotificationID     int                                     not null,
    TriggerTypeID      int                                     not null,
    TriggerSourceID    int                                     not null,
    UserID             int                                     not null,
    UnitID             int                                     not null,
    InspectionID       int                                     null,
    ObjectTaskID       int                                     null,
    Email              varchar(255)                            not null,
    Image              varchar(255)                            null,
    Comment            mediumtext                              null,
    SentAt             timestamp default '0000-00-00 00:00:00' not null,
    constraint sentnotifications_fk_inspections
        foreign key (InspectionID) references inspections (InspectionID)
            on update cascade on delete cascade,
    constraint sentnotifications_fk_notifications
        foreign key (NotificationID) references notifications (NotificationID)
            on update cascade,
    constraint sentnotifications_fk_objectstasks
        foreign key (ObjectTaskID) references objectstasks (ObjectTaskID)
            on update cascade,
    constraint `sentnotifications_fk_taxonomy (TriggerSourceID)`
        foreign key (TriggerSourceID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `sentnotifications_fk_taxonomy (TriggerTypeID)`
        foreign key (TriggerTypeID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint sentnotifications_fk_units
        foreign key (UnitID) references units (UnitID)
            on update cascade,
    constraint sentnotifications_fk_users
        foreign key (UserID) references users (UserID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index InspectionTypeID
    on sentnotifications (InspectionID);

create index NotificationID
    on sentnotifications (NotificationID);

create index ObjectTaskID
    on sentnotifications (ObjectTaskID);

create index SentAt
    on sentnotifications (SentAt);

create index TriggerSourceID
    on sentnotifications (TriggerSourceID);

create index TriggerTypeID
    on sentnotifications (TriggerTypeID);

create index UnitID
    on sentnotifications (UnitID);

create index UserID
    on sentnotifications (UserID);

create table tools_displays
(
    ToolDisplayID int auto_increment
        primary key,
    ToolID        int        not null,
    DisplayID     int        not null,
    MetaData      mediumtext null,
    constraint UniqueKey
        unique (ToolID, DisplayID),
    constraint tools_displays_fk_displays
        foreign key (DisplayID) references displays (DisplayID)
            on update cascade on delete cascade,
    constraint tools_displays_fk_tools
        foreign key (ToolID) references tools (ToolID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index DisplayID
    on tools_displays (DisplayID);

create index ToolID
    on tools_displays (ToolID);

create index BuildingID
    on units (BuildingID);

create index Description
    on units (Description);

create index HygieneProfileID
    on units (HygieneProfileID);

create index LastEventID
    on units (LastEventID);

create index PlanID
    on units (PlanID);

create index QualityProfielID
    on units (QualityProfileID);

create index RoomNumber
    on units (RoomNumber);

create index StatusID
    on units (StatusID);

create index Storey
    on units (Storey);

create index UnitID_BuildingID
    on units (UnitID, BuildingID);

create index UnitSizeID
    on units (UnitSizeID);

create table units_attributes
(
    AttributeID int auto_increment
        primary key,
    UnitID      int          not null,
    Name        varchar(255) not null,
    Value       varchar(255) not null,
    constraint units_attributes_fk_units
        foreign key (UnitID) references units (UnitID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index Name_Value
    on units_attributes (Name, Value);

create index UnitID
    on units_attributes (UnitID);

create table units_excludeddays
(
    ExcludedDayID int auto_increment
        primary key,
    UnitID        int          not null,
    ExcludedDay   date         not null,
    Reason        varchar(255) null,
    constraint UnitID_ExcludedDay
        unique (UnitID, ExcludedDay),
    constraint units_excludeddays_fk_units
        foreign key (UnitID) references units (UnitID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index UnitID
    on units_excludeddays (UnitID);

create table units_keyfigures
(
    UnitKeyFigureID int auto_increment
        primary key,
    UnitID          int not null,
    KeyFigureID     int not null,
    constraint UnitID
        unique (UnitID),
    constraint units_keyfigures_fk_keyfigures
        foreign key (KeyFigureID) references keyfigures (KeyFigureID)
            on update cascade on delete cascade,
    constraint units_keyfigures_fk_units
        foreign key (UnitID) references units (UnitID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index KeyFigureID
    on units_keyfigures (KeyFigureID);

create table units_objectsgroups
(
    UnitObjectGroupID int auto_increment
        primary key,
    UnitID            int           not null,
    ObjectGroupID     int           not null,
    Inventory         int default 0 not null,
    constraint units_objectsgroups_fk_objectsgroups
        foreign key (ObjectGroupID) references objectsgroups (ObjectGroupID)
            on update cascade on delete cascade,
    constraint units_objectsgroups_fk_units
        foreign key (UnitID) references units (UnitID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index Inventory
    on units_objectsgroups (Inventory);

create index ObjectGroupID
    on units_objectsgroups (ObjectGroupID);

create index UnitID
    on units_objectsgroups (UnitID);

create table units_objectstasks
(
    UnitObjectTaskID  int auto_increment
        primary key,
    UnitObjectGroupID int not null,
    ObjectTaskID      int not null,
    constraint units_objectstasks_fk_objectstasks
        foreign key (ObjectTaskID) references objectstasks (ObjectTaskID)
            on update cascade on delete cascade,
    constraint units_objectstasks_fk_units_objectsgroups
        foreign key (UnitObjectGroupID) references units_objectsgroups (UnitObjectGroupID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index ObjectTaskID
    on units_objectstasks (ObjectTaskID);

create index UnitObjectGroupID
    on units_objectstasks (UnitObjectGroupID);

create table units_sensors
(
    UnitSensorID int(11) unsigned auto_increment
        primary key,
    UnitID       int not null,
    SensorID     int not null,
    constraint SensorID
        unique (SensorID),
    constraint units_sensors_fk_sensors
        foreign key (SensorID) references sensors (SensorID)
            on update cascade on delete cascade,
    constraint units_sensors_fk_units
        foreign key (UnitID) references units (UnitID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index UnitID
    on units_sensors (UnitID);

create index CardNumber
    on users (CardNumber);

create index Login
    on users (Login);

create index StatusID
    on users (StatusID);

create index SubscriberID
    on users (SubscriberID);

create table users_customers
(
    UserCustomerID int auto_increment
        primary key,
    UserID         int        not null,
    CustomerID     int        not null,
    Permissions    mediumtext null,
    constraint users_customers_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade on delete cascade,
    constraint users_customers_fk_users
        foreign key (UserID) references users (UserID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index CustomerID
    on users_customers (CustomerID);

create index UserID
    on users_customers (UserID);

create table users_groups
(
    UserGroupID int auto_increment
        primary key,
    UserID      int not null,
    GroupID     int not null,
    constraint UserID_GroupID
        unique (UserID, GroupID),
    constraint users_groups_fk_groups
        foreign key (GroupID) references groups (GroupID)
            on update cascade on delete cascade,
    constraint users_groups_fk_users
        foreign key (UserID) references users (UserID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index GroupID
    on users_groups (GroupID);

create index UserID
    on users_groups (UserID);

create table users_roles
(
    UserRoleID int auto_increment
        primary key,
    UserID     int not null,
    RoleID     int not null,
    constraint users_roles_fk_taxonomy
        foreign key (RoleID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint users_roles_fk_users
        foreign key (UserID) references users (UserID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index RoleID
    on users_roles (RoleID);

create index UserID
    on users_roles (UserID);

create table users_subscribers
(
    UserSubscriberID int auto_increment
        primary key,
    UserID           int not null,
    SubscriberID     int not null,
    constraint UniqueueKey
        unique (UserID, SubscriberID),
    constraint users_subscribers_fk_subscribers
        foreign key (SubscriberID) references subscribers (SubscriberID)
            on update cascade on delete cascade,
    constraint users_subscribers_fk_users
        foreign key (UserID) references users (UserID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index SubscriberID
    on users_subscribers (SubscriberID);

create index UserID
    on users_subscribers (UserID);

create table workorders
(
    WorkorderID      int auto_increment
        primary key,
    CustomerID       int                                     not null,
    NotificationID   int                                     not null,
    ParentID         int                                     null,
    ContractID       int                                     null,
    InspectionUnitID int                                     null,
    UnitID           int                                     not null,
    IssueTypeID      int                                     not null,
    StatusID         int                                     not null,
    StateID          int                                     not null,
    UniqueNumber     varchar(255)                            not null,
    Comment          mediumtext                              null,
    ManagerComment   mediumtext                              null,
    OptionsMetaData  mediumtext                              null,
    Priority         int       default 0                     not null,
    CompletionHours  int       default 0                     not null,
    IsAutocompleted  tinyint   default 0                     not null,
    CompleteAt       datetime                                null,
    CreatedAt        timestamp default '0000-00-00 00:00:00' not null,
    AssignedAt       timestamp                               null,
    CompletedAt      datetime                                null,
    constraint UniqueNumber
        unique (UniqueNumber),
    constraint workorders_fk_customers
        foreign key (CustomerID) references customers (CustomerID)
            on update cascade on delete cascade,
    constraint workorders_fk_notifications
        foreign key (NotificationID) references notifications (NotificationID)
            on update cascade,
    constraint `workorders_fk_taxonomy (IssueTypeID)`
        foreign key (IssueTypeID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `workorders_fk_taxonomy (StateID)`
        foreign key (StateID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint `workorders_fk_taxonomy (StatusID)`
        foreign key (StatusID) references taxonomy (TaxonomyID)
            on update cascade on delete cascade,
    constraint workorders_fk_units
        foreign key (UnitID) references units (UnitID)
            on update cascade on delete cascade,
    constraint workorders_fk_workorders
        foreign key (ParentID) references workorders (WorkorderID)
            on update cascade
)
    collate = utf8mb4_swedish_ci;

create index CreatedAt
    on workorders (CreatedAt);

create index CustomerID
    on workorders (CustomerID);

create index CustomerID_WorkorderID
    on workorders (CustomerID, WorkorderID);

create index IssueTypeID
    on workorders (IssueTypeID);

create index NotificationID
    on workorders (NotificationID);

create index ParentID
    on workorders (ParentID);

create index StateID
    on workorders (StateID);

create index StatusID
    on workorders (StatusID);

create index UnitID
    on workorders (UnitID);

create table workorders_groups
(
    WorkorderGroupID int auto_increment
        primary key,
    WorkorderID      int not null,
    GroupID          int not null,
    constraint workorders_groups_fk_groups
        foreign key (GroupID) references groups (GroupID)
            on update cascade on delete cascade,
    constraint workorders_groups_fk_workorders
        foreign key (WorkorderID) references workorders (WorkorderID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index GroupID
    on workorders_groups (GroupID);

create index WorkorderID
    on workorders_groups (WorkorderID);

create table workorders_images
(
    WorkorderImageID int,
    WorkorderID      int          not null,
    FileName         varchar(255) not null,
    constraint workorders_images_fk_workorders
        foreign key (WorkorderID) references workorders (WorkorderID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index WorkorderID
    on workorders_images (WorkorderID);

create index WorkorderImageID
    on workorders_images (WorkorderImageID);

alter table workorders_images
    modify WorkorderImageID int auto_increment;

create table workorders_objectstasks
(
    WorkorderObjectTaskID int auto_increment
        primary key,
    WorkorderID           int not null,
    ObjectTaskID          int not null,
    constraint workorders_objectstasks_fk_objectstasks
        foreign key (ObjectTaskID) references objectstasks (ObjectTaskID)
            on update cascade on delete cascade,
    constraint workorders_objectstasks_fk_workorders
        foreign key (WorkorderID) references workorders (WorkorderID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index ObjectTaskID
    on workorders_objectstasks (ObjectTaskID);

create index WorkorderID
    on workorders_objectstasks (WorkorderID);

create index WorkorderID_ObjectTaskID
    on workorders_objectstasks (WorkorderID, ObjectTaskID);

create table workorders_reminders
(
    WorkorderReminderID int auto_increment
        primary key,
    WorkorderID         int           not null,
    Reminder            int default 0 not null,
    NotStartedHours     int default 0 not null,
    NotFinishedHours    int default 0 not null,
    Performed           int default 0 not null,
    constraint workorders_reminders_fk_workorders
        foreign key (WorkorderID) references workorders (WorkorderID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create table workorders_users
(
    WorkorderUserID int auto_increment
        primary key,
    WorkorderID     int not null,
    UserID          int not null,
    constraint workorders_users_fk_users
        foreign key (UserID) references users (UserID)
            on update cascade on delete cascade,
    constraint workorders_users_fk_workorders
        foreign key (WorkorderID) references workorders (WorkorderID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index UserID
    on workorders_users (UserID);

create index WorkorderID
    on workorders_users (WorkorderID);

create table workreports
(
    WorkreportID int auto_increment
        primary key,
    WorkorderID  int                                      not null,
    UserID       int                                      not null,
    Comment      mediumtext                               null,
    MetaData     mediumtext                               null,
    InvokedByTag tinyint(1) default 0                     not null,
    AcceptedAt   timestamp  default '0000-00-00 00:00:00' not null,
    StartedAt    timestamp                                null,
    FinishedAt   timestamp                                null,
    constraint WorkorderID
        unique (WorkorderID),
    constraint workreports_fk_users
        foreign key (UserID) references users (UserID)
            on update cascade on delete cascade,
    constraint workreports_fk_workorders
        foreign key (WorkorderID) references workorders (WorkorderID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index UserID
    on workreports (UserID);

create table workreportsimages
(
    WorkreportImageID int auto_increment
        primary key,
    WorkreportID      int                not null,
    TypeID            int default 300201 not null,
    ObjectTaskID      int                not null,
    FileName          varchar(255)       not null,
    Comment           mediumtext         null,
    constraint workreportsimages_fk_objectstasks
        foreign key (ObjectTaskID) references objectstasks (ObjectTaskID)
            on update cascade,
    constraint `workreportsimages_fk_taxonomy (TypeID)`
        foreign key (TypeID) references taxonomy (TaxonomyID)
            on update cascade,
    constraint workreportsimages_fk_workreports
        foreign key (WorkreportID) references workreports (WorkreportID)
            on update cascade on delete cascade
)
    collate = utf8mb4_swedish_ci;

create index ObjectTaskID
    on workreportsimages (ObjectTaskID);

create index TypeID
    on workreportsimages (TypeID);

create index WorkreportID
    on workreportsimages (WorkreportID);

create
definer = root@`192.168.168.%` procedure handle_feedback_change(IN p_feedback_id int)
-- missing source code
;

