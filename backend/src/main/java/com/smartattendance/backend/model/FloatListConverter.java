package com.smartattendance.backend.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.List;

/**
 * Stores a List<Float> (the 128-number face descriptor) in a single TEXT column as
 * "0.0123,-0.0456,...".
 *
 * The previous mapping used a separate table with one row per number. That was slow (128 rows per
 * student) and, more importantly, SQL does not guarantee row order without an ORDER BY - and the
 * order of the 128 numbers is exactly what makes a descriptor meaningful.
 */
@Converter
public class FloatListConverter implements AttributeConverter<List<Float>, String> {

    @Override
    public String convertToDatabaseColumn(List<Float> values) {
        if (values == null || values.isEmpty()) return null;
        StringBuilder sb = new StringBuilder(values.size() * 12);
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append(values.get(i));
        }
        return sb.toString();
    }

    @Override
    public List<Float> convertToEntityAttribute(String column) {
        if (column == null || column.isBlank()) return null;
        String[] parts = column.split(",");
        List<Float> values = new ArrayList<>(parts.length);
        for (String part : parts) {
            values.add(Float.parseFloat(part));
        }
        return values;
    }
}
