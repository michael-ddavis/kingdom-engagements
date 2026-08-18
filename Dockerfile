FROM node:24-bookworm-slim AS client
WORKDIR /client
COPY src/KingdomEngagements.Web/ClientApp/package.json ./
RUN npm install
COPY src/KingdomEngagements.Web/ClientApp/ ./
RUN npm run build:production

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/KingdomEngagements.Web/KingdomEngagements.Web.csproj src/KingdomEngagements.Web/
RUN dotnet restore src/KingdomEngagements.Web/KingdomEngagements.Web.csproj
COPY . .
RUN dotnet publish src/KingdomEngagements.Web/KingdomEngagements.Web.csproj \
    --configuration Release \
    --property:BuildAngular=false \
    --no-restore \
    --output /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
RUN apt-get update \
    && apt-get install --yes --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/publish .
COPY --from=client /client/dist/ClientApp/browser ./wwwroot/app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=18 \
    CMD curl --fail --silent http://localhost:8080/health >/dev/null || exit 1
ENTRYPOINT ["dotnet", "KingdomEngagements.Web.dll"]
