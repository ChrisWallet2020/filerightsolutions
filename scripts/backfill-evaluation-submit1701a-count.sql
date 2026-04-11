-- Run once after deploying `submit1701aCount` so existing evaluations with a submission show count >= 1.
-- Resubmissions after deploy are tracked automatically (count > 1 shows the bell in admin).
UPDATE "Evaluation" AS e
SET "submit1701aCount" = 1
WHERE e."submit1701aCount" = 0
  AND EXISTS (
    SELECT 1 FROM "Evaluation1701ASubmission" AS s WHERE s."evaluationId" = e.id
  );
