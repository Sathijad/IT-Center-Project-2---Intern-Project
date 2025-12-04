using System.Text.Json;
using System.Text.Json.Serialization;

namespace Performance.Infrastructure.JsonConverters;

public class DateOnlyJsonConverter : JsonConverter<DateOnly>
{
    public override DateOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            var value = reader.GetString();
            if (DateOnly.TryParse(value, out var date))
            {
                return date;
            }
        }
        else if (reader.TokenType == JsonTokenType.StartObject)
        {
            // Handle object format if needed
            using var doc = JsonDocument.ParseValue(ref reader);
            var root = doc.RootElement;
            if (root.TryGetProperty("year", out var year) &&
                root.TryGetProperty("month", out var month) &&
                root.TryGetProperty("day", out var day))
            {
                return new DateOnly(year.GetInt32(), month.GetInt32(), day.GetInt32());
            }
        }

        throw new JsonException($"Unable to convert \"{reader.GetString()}\" to DateOnly.");
    }

    public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.ToString("yyyy-MM-dd"));
    }
}

public class NullableDateOnlyJsonConverter : JsonConverter<DateOnly?>
{
    public override DateOnly? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
        {
            return null;
        }

        if (reader.TokenType == JsonTokenType.String)
        {
            var value = reader.GetString();
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }
            if (DateOnly.TryParse(value, out var date))
            {
                return date;
            }
        }

        throw new JsonException($"Unable to convert \"{reader.GetString()}\" to DateOnly?.");
    }

    public override void Write(Utf8JsonWriter writer, DateOnly? value, JsonSerializerOptions options)
    {
        if (value.HasValue)
        {
            writer.WriteStringValue(value.Value.ToString("yyyy-MM-dd"));
        }
        else
        {
            writer.WriteNullValue();
        }
    }
}

