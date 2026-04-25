package election.ems_backend.utility;


import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Converts JsonNode <-> String for JSONB column storage.
 */
@Converter(autoApply = false)
public class JsonNodeConverter implements AttributeConverter<JsonNode, String> {

    private static final ObjectMapper M = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(JsonNode attribute) {
        if (attribute == null) return null;
        try {
            return M.writeValueAsString(attribute);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to convert JsonNode to String", e);
        }
    }

    @Override
    public JsonNode convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        try {
            return M.readTree(dbData);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to convert String to JsonNode", e);
        }
    }
}