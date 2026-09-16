// API response wrappers
export type { ApiResponse, PaginatedResponse, ApiError } from './schemas/common.js';

// Auth
export {
    UserRoleEnum,
    SubscriptionTierEnum,
    UserSchema,
    SignUpSchema,
    StrictSignUpSchema,
    passwordSchema,
    SignInSchema,
    ResetPasswordSchema,
    NewPasswordSchema,
    StrictNewPasswordSchema,
    ManagerSummarySchema,
    AdminUserSchema,
    UserListQuerySchema,
    AdminUpdateUserSchema,
    AdminDeleteUserSchema,
    UserListResponseSchema,
    USER_SORT_FIELDS
} from './schemas/auth.js';
export type {
    User,
    SignUp,
    SignIn,
    ResetPassword,
    NewPassword,
    UserRole,
    SubscriptionTier,
    ManagerSummary,
    AdminUser,
    UserListQuery,
    UserSortField,
    AdminUpdateUser,
    AdminDeleteUser,
    UserListResponse
} from './schemas/auth.js';

// Invitation
export {
    InvitationStatusEnum,
    InvitationSchema,
    CreateInvitationSchema,
    InvitationListResponseSchema,
    InvitationPublicSchema,
    AcceptInvitationSchema
} from './schemas/invitation.js';
export type {
    Invitation,
    InvitationStatus,
    CreateInvitation,
    InvitationListResponse,
    InvitationPublic,
    AcceptInvitation
} from './schemas/invitation.js';

// Property
export {
    PropertyTypeEnum,
    AvailabilityStatusEnum,
    PropertySchema,
    PropertyAvailabilityStatusSchema,
    BookedRangeSchema,
    PropertyRangeAvailabilitySchema,
    CreatePropertySchema,
    UpdatePropertySchema,
    PropertyFilterSchema,
    PropertySortField,
    PropertySortOrder,
    TransferPropertySchema,
    checkPriceBounds
} from './schemas/property.js';
export {
    IMPORT_MAX_ROWS,
    IMPORT_MAX_FILE_BYTES,
    IMPORT_MAX_PHOTOS_PER_ROW,
    ImportRowErrorSchema,
    ImportErrorDetailsSchema,
    ImportResultSchema
} from './schemas/property-import.js';
export type { ImportRowError, ImportErrorDetails, ImportResult } from './schemas/property-import.js';
export type {
    Property,
    CreateProperty,
    UpdateProperty,
    PropertyFilter,
    PropertyType,
    AvailabilityStatus,
    PropertyAvailabilityStatus,
    BookedRange,
    PropertyRangeAvailability,
    PropertySortFieldValue,
    PropertySortOrderValue,
    TransferProperty
} from './schemas/property.js';

// Booking
export {
    BookingStatusEnum,
    CancellationReasonEnum,
    BookingSchema,
    CreateBookingSchema,
    BookingParamsSchema,
    BookingQuerySchema,
    BookingConfirmQuerySchema,
    PendingNearExpiryCountSchema,
    BOOKING_SORT_FIELDS,
    BOOKING_STATUSES_OCCUPYING,
    BOOKING_STATUSES_LIVE,
    BOOKING_STATUS_COMPLETED
} from './schemas/booking.js';
export type {
    Booking,
    CreateBooking,
    BookingStatus,
    CancellationReason,
    BookingParams,
    BookingQuery,
    BookingSortField,
    BookingConfirmQuery,
    PendingNearExpiryCount
} from './schemas/booking.js';

// Feedback
export {
    FeedbackSentimentEnum,
    FeedbackSchema,
    CreateFeedbackSchema,
    FeedbackBookingParamsSchema,
    FeedbackPropertyParamsSchema,
    FeedbackAggregationQuerySchema,
    FeedbackOverTimeEntrySchema,
    TopicWithSentimentSchema,
    FeedbackAnalysisSchema,
    ClassifyResultSchema,
    AspectsResultSchema,
    FeedbackAggregationSchema,
    ScoreDistributionSchema,
    FeedbackPreviousWindowSchema,
    EligibleBookingSchema,
    EligibleFeedbackResponseSchema,
    FEEDBACK_SORT_FIELDS
} from './schemas/feedback.js';
export type {
    Feedback,
    CreateFeedback,
    FeedbackBookingParams,
    FeedbackPropertyParams,
    FeedbackAnalysis,
    ClassifyResult,
    AspectsResult,
    FeedbackSentiment,
    FeedbackAggregation,
    FeedbackAggregationQuery,
    FeedbackSortField,
    FeedbackOverTimeEntry,
    TopicWithSentiment,
    ScoreDistribution,
    FeedbackPreviousWindow,
    EligibleBooking,
    EligibleFeedbackResponse
} from './schemas/feedback.js';

// Ticket
export {
    TicketStatusEnum,
    TicketPriorityEnum,
    TicketCategoryEnum,
    TicketSchema,
    TicketListResponseSchema,
    CreateTicketSchema,
    CreateTicketMessageSchema,
    SuggestReplySchema,
    TICKET_REPLY_LANGUAGES,
    TicketMessageSchema,
    TicketEventSchema,
    TICKET_EVENT,
    UpdateTicketStatusSchema,
    TicketParamsSchema,
    TicketQuerySchema,
    TicketClassificationSchema,
    UpdateCategoryAssigneesSchema,
    CategoryParamsSchema,
    ReassignTicketSchema,
    CategoryRoutingSchema,
    CategoryRoutingListSchema,
    CRITICAL_TICKET_PRIORITIES,
    TICKET_STATUSES_TERMINAL,
    TICKET_SORT_FIELDS,
    isUrgentTicket
} from './schemas/ticket.js';
export type {
    Ticket,
    CreateTicket,
    UpdateTicketStatus,
    TicketQuery,
    TicketParams,
    TicketClassification,
    TicketListResponse,
    TicketStatus,
    TicketPriority,
    TicketCategory,
    UpdateCategoryAssignees,
    ReassignTicket,
    CategoryRouting,
    CategoryRoutingList,
    TicketSortField,
    TicketMessage,
    CreateTicketMessage,
    TicketEvent,
    SuggestReply,
    TicketReplyLanguage
} from './schemas/ticket.js';

// Ticket stats
export {
    TicketStatsQuerySchema,
    TicketStatsSchema,
    AssigneeStatsSchema,
    PriorityBreakdownSchema,
    CategoryBreakdownSchema
} from './schemas/ticket-stats.js';
export type { TicketStatsQuery, TicketStats, AssigneeStats } from './schemas/ticket-stats.js';

// Upload
export { UploadSignatureRequestSchema, DeleteUploadRequestSchema } from './schemas/upload.js';
export type { UploadSignatureRequest, DeleteUploadRequest } from './schemas/upload.js';

// Admin
export {
    AdminStatsSchema,
    AdminStatsTotalsSchema,
    OccupancyPointSchema,
    AdminRecentBookingSchema,
    AdminCriticalTicketSchema,
    AdminPropertyStatsSchema
} from './schemas/admin.js';
export type {
    AdminStats,
    AdminStatsTotals,
    OccupancyPoint,
    AdminRecentBooking,
    AdminCriticalTicket,
    AdminPropertyStats
} from './schemas/admin.js';

// List query (shared pagination + sort)
export { PaginationSchema, sortSchema } from './schemas/list-query.js';
export type { SortOrder } from './schemas/list-query.js';

// Utils
export { extractPublicId, cloudinaryUrl } from './utils/cloudinary.js';

// Pricing
export {
    PricingRuleTypeEnum,
    PricingRequestSchema,
    PricingResponseSchema,
    PricingQuerySchema,
    PricingRuleSchema,
    PricingRuleCreateSchema,
    PricingRuleUpdateSchema,
    PricingRuleListQuerySchema,
    PricingRulesListResponseSchema,
    PricingModelMetadataSchema,
    PricingRuleIdParamsSchema,
    PriceDriftDetailsSchema,
    PriceBreakdownNightSchema,
    DurationDiscountAppliedSchema
} from './schemas/pricing.js';
export type {
    PricingRequest,
    PricingResponse,
    PricingQuery,
    PricingRuleType,
    PricingRule,
    PricingRuleCreate,
    PricingRuleUpdate,
    PricingRuleListQuery,
    PricingRulesListResponse,
    PriceDriftDetails,
    PricingModelMetadata,
    PriceBreakdownNight,
    DurationDiscountApplied
} from './schemas/pricing.js';

// Profile (self-service)
export {
    UpdateMyProfileSchema,
    MyProfileFieldsSchema,
    CountryStatSchema,
    JourneyStopSchema,
    TravelStatsSchema,
    MyProfileResponseSchema
} from './schemas/profile.js';
export type {
    UpdateMyProfile,
    MyProfileFields,
    CountryStat,
    JourneyStop,
    TravelStats,
    MyProfileResponse
} from './schemas/profile.js';

// Geo
export { CITY_COUNTRY, lookupCityGeo } from './utils/geo.js';
export type { CityGeo } from './utils/geo.js';
