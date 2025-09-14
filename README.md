<p align="center">
  <img width="400px" src="https://raw.githubusercontent.com/CXDezign/MDC-Panel/9422146d3c4d902c141ad16b97c029f885bc3892/images/MDC-Panel.svg">
</p>

## Database Configuration

Select the database backend by setting the `DATABASE` variable in your `.env` file. Supported values are `sqlite`, `mysql`, and `mariadb`.

When using SQLite, the optional `DB_FILE_NAME` sets the file location. For MySQL or MariaDB, provide a connection string via `DB_URL`.
