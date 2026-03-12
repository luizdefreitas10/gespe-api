-- Remove duplicidades legadas para permitir aplicação das restrições únicas
WITH ranked_vacations AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY
        user_id,
        "firstVacationDay",
        "lastVacationDay",
        "requestType",
        year,
        "amoutOfVacationDays",
        ("vacationSeiNumber" IS NULL),
        COALESCE("vacationSeiNumber", '')
      ORDER BY id
    ) AS row_number
  FROM vacations
)
DELETE FROM vacations v
USING ranked_vacations rv
WHERE v.ctid = rv.ctid
  AND rv.row_number > 1;

WITH ranked_tre AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY
        "user_Id",
        "firstTreDay",
        "lastTreDay",
        "requestType",
        "yearOfAcquisition",
        "amoutOfTreDays",
        ("treSeiNumber" IS NULL),
        COALESCE("treSeiNumber", '')
      ORDER BY id
    ) AS row_number
  FROM tre
)
DELETE FROM tre t
USING ranked_tre rt
WHERE t.ctid = rt.ctid
  AND rt.row_number > 1;

-- Restrição única de negócio para férias (inclui tratamento para SEI nulo)
CREATE UNIQUE INDEX "vacations_unique_business_key"
ON vacations (
  user_id,
  "firstVacationDay",
  "lastVacationDay",
  "requestType",
  year,
  "amoutOfVacationDays",
  ("vacationSeiNumber" IS NULL),
  COALESCE("vacationSeiNumber", '')
);

-- Restrição única de negócio para TRE (inclui tratamento para SEI nulo)
CREATE UNIQUE INDEX "tre_unique_business_key"
ON tre (
  "user_Id",
  "firstTreDay",
  "lastTreDay",
  "requestType",
  "yearOfAcquisition",
  "amoutOfTreDays",
  ("treSeiNumber" IS NULL),
  COALESCE("treSeiNumber", '')
);
