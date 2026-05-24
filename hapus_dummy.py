import sqlite3

conn = sqlite3.connect('database.db')
# Menghapus data di mana nomor berkasnya adalah B-001
conn.execute("DELETE FROM data_berkas WHERE no_berkas = 'B-001'")
conn.commit()
conn.close()

print("Data Budi Santoso (Dummy) berhasil dihapus!")