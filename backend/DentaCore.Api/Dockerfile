FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY DentaCore.Domain/DentaCore.Domain.csproj DentaCore.Domain/
COPY DentaCore.Application/DentaCore.Application.csproj DentaCore.Application/
COPY DentaCore.Infrastructure/DentaCore.Infrastructure.csproj DentaCore.Infrastructure/
COPY DentaCore.Api/DentaCore.Api.csproj DentaCore.Api/
RUN dotnet restore DentaCore.Api/DentaCore.Api.csproj
COPY DentaCore.Domain/ DentaCore.Domain/
COPY DentaCore.Application/ DentaCore.Application/
COPY DentaCore.Infrastructure/ DentaCore.Infrastructure/
COPY DentaCore.Api/ DentaCore.Api/
RUN dotnet publish DentaCore.Api/DentaCore.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app/publish .
RUN mkdir -p /home/app/.aspnet/DataProtection-Keys \
    && chown -R $APP_UID:$APP_UID /home/app/.aspnet
USER $APP_UID
ENTRYPOINT ["dotnet", "DentaCore.Api.dll"]
