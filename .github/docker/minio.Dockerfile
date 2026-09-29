# MinIO no longer publishes the community image used by this smoke test.
# Build the official, pinned releases for this disposable CI fixture only.
FROM golang:1.24.8-bookworm AS build
ENV CGO_ENABLED=0
RUN go install github.com/minio/minio@RELEASE.2025-10-15T17-29-55Z
RUN go install github.com/minio/mc@RELEASE.2025-08-13T08-35-41Z

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /go/bin/minio /usr/local/bin/minio
COPY --from=build /go/bin/mc /usr/local/bin/mc
EXPOSE 9000
ENTRYPOINT ["minio"]
