FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/KingdomEngagements.Web/KingdomEngagements.Web.csproj src/KingdomEngagements.Web/
RUN dotnet restore src/KingdomEngagements.Web/KingdomEngagements.Web.csproj
COPY . .
RUN dotnet publish src/KingdomEngagements.Web/KingdomEngagements.Web.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
RUN apt-get update \
    && apt-get install --yes --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "KingdomEngagements.Web.dll"]
