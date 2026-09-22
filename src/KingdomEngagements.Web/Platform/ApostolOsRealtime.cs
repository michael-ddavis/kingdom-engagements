namespace KingdomEngagements.Web.Platform;

public static class ApostolOsRealtimeGroups
{
    public static string ForResource(
        Guid tenantId,
        string resourceType,
        Guid resourceId)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("A tenant id is required.", nameof(tenantId));

        if (resourceId == Guid.Empty)
            throw new ArgumentException("A resource id is required.", nameof(resourceId));

        if (string.IsNullOrWhiteSpace(resourceType))
            throw new ArgumentException("A resource type is required.", nameof(resourceType));

        var normalizedResourceType = resourceType.Trim().ToLowerInvariant();
        return $"tenant:{tenantId:D}:{normalizedResourceType}:{resourceId:D}";
    }
}
