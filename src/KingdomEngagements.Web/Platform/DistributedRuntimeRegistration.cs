using Microsoft.AspNetCore.DataProtection;
using StackExchange.Redis;

namespace KingdomEngagements.Web.Platform;

public static class DistributedRuntimeRegistration
{
    private const string DefaultApplicationName = "ApostolOS";
    private const string DefaultChannelPrefix = "ApostolOS:Engagements";
    private const string DefaultDataProtectionKey = "ApostolOS:DataProtectionKeys";

    public static void AddApostolOSDistributedRuntime(this WebApplicationBuilder builder)
    {
        var configuration = builder.Configuration;
        var redisConnectionString = configuration.GetConnectionString("Redis");
        var requireRedis = configuration.GetValue("KingdomOS:DistributedRuntime:RequireRedis", false);
        var applicationName =
            configuration["KingdomOS:DistributedRuntime:ApplicationName"]
            ?? DefaultApplicationName;

        if (requireRedis && string.IsNullOrWhiteSpace(redisConnectionString))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:Redis is required when KingdomOS:DistributedRuntime:RequireRedis is enabled.");
        }

        var dataProtection = builder.Services
            .AddDataProtection()
            .SetApplicationName(applicationName);

        var signalR = builder.Services.AddSignalR();

        if (!string.IsNullOrWhiteSpace(redisConnectionString))
        {
            var redisOptions = ConfigurationOptions.Parse(redisConnectionString);
            redisOptions.AbortOnConnectFail = false;

            var redis = new Lazy<IConnectionMultiplexer>(
                () => ConnectionMultiplexer.Connect(redisOptions),
                LazyThreadSafetyMode.ExecutionAndPublication);

            builder.Services.AddSingleton<IConnectionMultiplexer>(_ => redis.Value);

            var dataProtectionKey = configuration["KingdomOS:DistributedRuntime:DataProtectionKey"]
                ?? DefaultDataProtectionKey;

            dataProtection.PersistKeysToStackExchangeRedis(
                () => redis.Value.GetDatabase(),
                dataProtectionKey);

            var channelPrefix = configuration["KingdomOS:DistributedRuntime:SignalRChannelPrefix"]
                ?? DefaultChannelPrefix;

            signalR.AddStackExchangeRedis(
                redisConnectionString,
                options =>
                {
                    options.Configuration.ChannelPrefix = RedisChannel.Literal(channelPrefix);
                });

            return;
        }

        var keyPath = configuration["KingdomOS:Identity:KeyPath"];
        if (string.IsNullOrWhiteSpace(keyPath))
            return;

        Directory.CreateDirectory(keyPath);
        dataProtection.PersistKeysToFileSystem(new DirectoryInfo(keyPath));
    }
}
