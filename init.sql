CREATE TABLE ASYNC_MESSAGES (
  RECORD_ID SERIAL,
  SENDER_NAME VARCHAR(30),
  MESSAGE VARCHAR(30),
  SENT_TIME TIMESTAMP,
  RECEIVED_TIME TIMESTAMP
);