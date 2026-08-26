import app from "./app";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  console.log(`Swagger docs: http://localhost:${PORT}/api/docs`);
});
