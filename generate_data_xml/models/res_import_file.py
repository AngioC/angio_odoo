# -*- coding: utf-8 -*-
# © 2024 AngioC (<cotardoangelo@gmail.com>)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import fields, models, api
import os.path
import csv
import base64
import io
import random
import string
from xlrd import open_workbook
import tempfile
import binascii
from odoo.exceptions import ValidationError


class ResImportFile(models.Model):
    _name = 'res.import.file'
    _description = 'Import file'

    name = fields.Char(string="Name")
    load_file = fields.Binary('Load file', required=True)
    file_extension = fields.Char(string="File extension")
    column_list = fields.Char(string="Column list")
    model_name = fields.Char(string="Model name")

    @api.onchange('load_file')
    def _on_change_load_file(self):
        if self.load_file:
            extension = os.path.splitext(self.name)[1]
            self.file_extension = extension

            if extension == ".csv":
                print("Read column")
                csv_data = base64.b64decode(self.load_file)
                data_file = io.StringIO(csv_data.decode("utf-8"))
                data_file.seek(0)
                file_reader = []
                csv_reader = csv.reader(data_file, delimiter=',')
                file_reader.extend(csv_reader)

                self.column_list = ", ".join(str(x) for x in file_reader[0])
            elif extension == ".xlsx":
                fp = tempfile.NamedTemporaryFile(suffix=".xlsx")
                fp.write(binascii.a2b_base64(self.load_file))
                fp.seek(0)
                workbook = open_workbook(fp.name)
                sheet = workbook.sheet_by_index(0)

                headers = list(map(lambda row: row.value.encode('utf-8'), sheet.row(0)))
                self.column_list = ", ".join(str(x.decode("utf-8")) for x in headers)
            else:
                self.file_extension = False
                self.column_list = False
                self.name = False
                self.load_file = False
                raise ValidationError("Error! Currently the algorithm can only support CSV or XLSX files.")
        else:
            self.file_extension = False
            self.column_list = False

    def generate_xml_data(self):
        print("Download")
        if self.file_extension == ".csv":
            f = open("/tmp/temporary_xml_data.txt", "a")

            csv_data = base64.b64decode(self.load_file)
            data_file = io.StringIO(csv_data.decode("utf-8"))
            data_file.seek(0)
            file_reader = []
            csv_reader = csv.reader(data_file, delimiter=',')
            file_reader.extend(csv_reader)

            column_list = file_reader[0]
            i = 0

            f.write('<?xml version="1.0" encoding="utf-8"?>\n\n')
            f.write('<odoo noupdate="0">\n\n')

            for row in file_reader[1:]:
                random_id = ''.join(
                    random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(6))

                f.write('\t<record id="' + str(random_id) + '" model="' + str(self.model_name) + '">\n')
                x = 0
                for element in row:
                    name = column_list[x]
                    f.write('\t\t<field name="' + str(name) + '">' + str(element) + '</field>\n')
                    x += 1
                f.write('\t</record>\n\n')
                i += 1

            f.write('</odoo>\n')
            f.close()

            with open('/tmp/temporary_xml_data.txt', "rb") as excel_file:
                file_base64 = base64.b64encode(excel_file.read())
            wiz_id = self.env['download.export'].create(
                {
                    'export_file': file_base64,
                    'file_name': 'xml_data.xml'
                })

            os.remove("/tmp/temporary_xml_data.txt")
            return {
                'type': 'ir.actions.act_window',
                'view_type': 'form',
                'view_mode': 'form',
                'res_model': 'download.export',
                'res_id': wiz_id.id,
                'target': 'new',
                'flags': {'mode': 'readonly'},
            }

        if self.file_extension == ".xlsx" or self.file_extension == ".xls":
            fp = tempfile.NamedTemporaryFile(suffix=".xlsx")
            fp.write(binascii.a2b_base64(self.load_file))
            fp.seek(0)
            workbook = open_workbook(fp.name)
            sheet = workbook.sheet_by_index(0)

            headers = list(map(lambda row: row.value.encode('utf-8'), sheet.row(0)))
            f = open("/tmp/temporary_xml_data_xlsx.txt", "a")

            f.write('<?xml version="1.0" encoding="utf-8"?>\n\n')
            f.write('<odoo noupdate="0">\n\n')

            i = 0
            for row_no in range(sheet.nrows):
                if row_no <= 0:
                    fields = map(lambda row: row.value.encode('utf-8'), sheet.row(row_no))
                else:
                    line = list(
                        map(lambda row: isinstance(row.value, str) and row.value.encode('utf-8') or str(row.value),
                            sheet.row(row_no)))

                    random_id = ''.join(
                        random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(6))

                    f.write('\t<record id="' + str(random_id) + '" model="' + str(self.model_name) + '">\n')
                    x = 0
                    for element in line:
                        name = headers[x].decode("utf-8")

                        try:
                            element = element.decode("utf-8")
                        except:
                            pass

                        f.write('\t\t<field name="' + str(name) + '">' + str(element) + '</field>\n')
                        x += 1
                    f.write('\t</record>\n\n')
                    i += 1

            f.write('</odoo>\n')
            f.close()

            with open('/tmp/temporary_xml_data_xlsx.txt', "rb") as excel_file:
                file_base64 = base64.b64encode(excel_file.read())
            wiz_id = self.env['download.export'].create(
                {
                    'export_file': file_base64,
                    'file_name': 'xml_data.xml'
                })

            os.remove("/tmp/temporary_xml_data_xlsx.txt")
            return {
                'type': 'ir.actions.act_window',
                'view_type': 'form',
                'view_mode': 'form',
                'res_model': 'download.export',
                'res_id': wiz_id.id,
                'target': 'new',
                'flags': {'mode': 'readonly'},
            }

        else:
            raise ValidationError("Error! Unable to generate XML data file.")
