import { motion } from 'framer-motion';
import { Quote, Star } from 'lucide-react';

interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  content: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    name: 'João Silva',
    role: 'Gerente de Comunidade',
    avatar: 'JS',
    content: 'TeleCopy Pro revolucionou a forma como gerencio meus canais. Economizo horas todos os dias!',
    rating: 5,
  },
  {
    name: 'Maria Santos',
    role: 'Administradora de Canais',
    avatar: 'MS',
    content: 'A cópia em tempo real é incrível! Minhas mensagens são transferidas instantaneamente.',
    rating: 5,
  },
  {
    name: 'Pedro Oliveira',
    role: 'Criador de Conteúdo',
    avatar: 'PO',
    content: 'Interface simples e intuitiva. Consegui configurar tudo em menos de 5 minutos.',
    rating: 5,
  },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-16 md:py-24 bg-muted/20">
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            O Que Nossos Clientes Dizem
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Junte-se a centenas de usuários satisfeitos
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="bg-card border rounded-lg p-6 relative"
            >
              <Quote className="h-8 w-8 text-primary/20 absolute top-4 right-4" />

              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>

              <p className="text-muted-foreground mb-6 relative z-10">
                "{testimonial.content}"
              </p>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
