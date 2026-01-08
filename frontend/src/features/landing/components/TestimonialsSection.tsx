import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';

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
    content: 'Clona Gram revolucionou a forma como gerencio meus canais. Economizo horas todos os dias com a automação de cópias!',
    rating: 5,
  },
  {
    name: 'Maria Santos',
    role: 'Administradora de Canais',
    avatar: 'MS',
    content: 'A cópia em tempo real é simplesmente incrível! Minhas mensagens são transferidas instantaneamente sem erros.',
    rating: 5,
  },
  {
    name: 'Pedro Oliveira',
    role: 'Criador de Conteúdo',
    avatar: 'PO',
    content: 'Interface simples e intuitiva. Consegui configurar tudo em menos de 5 minutos. Recomendo para todos!',
    rating: 5,
  },
  {
    name: 'Ana Costa',
    role: 'Marketing Digital',
    avatar: 'AC',
    content: 'O suporte é excepcional e o preço justo. Melhor investimento que fiz para automatizar meu trabalho.',
    rating: 5,
  },
  {
    name: 'Carlos Mendes',
    role: 'Empreendedor Digital',
    avatar: 'CM',
    content: 'Uso o plano Enterprise e não me arrependo. Jobs ilimitados e performance impecável em todos os meus canais.',
    rating: 5,
  },
];

function TestimonialCard({ testimonial, isActive }: { testimonial: Testimonial; isActive?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isActive ? 1 : 0.5, scale: isActive ? 1 : 0.9 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'bg-card/80 backdrop-blur-sm border rounded-2xl p-6 relative',
        'transition-all duration-300',
        isActive
          ? 'border-primary/30 shadow-xl'
          : 'border-border/50'
      )}
    >
      {/* Quote icon */}
      <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
        <Quote className="h-5 w-5 text-white" />
      </div>

      {/* Stars */}
      <div className="flex items-center gap-1 mb-4 pt-2">
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Star className="h-4 w-4 fill-warning text-warning" />
          </motion.div>
        ))}
      </div>

      {/* Content */}
      <p className="text-foreground leading-relaxed mb-6 text-lg italic">
        "{testimonial.content}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shadow-md">
          {testimonial.avatar}
        </div>
        <div>
          <div className="font-semibold text-foreground">{testimonial.name}</div>
          <div className="text-sm text-muted-foreground">{testimonial.role}</div>
        </div>
      </div>
    </motion.div>
  );
}

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play carousel
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handlePrev = () => {
    setIsAutoPlaying(false);
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleNext = () => {
    setIsAutoPlaying(false);
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  return (
    <section id="testimonials" className="py-20 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-muted/30" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-4 text-sm font-medium text-primary bg-primary/10 rounded-full"
          >
            Depoimentos
          </motion.span>

          <h2 className="heading-2 mb-4">
            O Que Nossos <span className="text-gradient">Clientes Dizem</span>
          </h2>

          <p className="body-large text-muted-foreground max-w-2xl mx-auto">
            Junte-se a centenas de usuários satisfeitos que automatizam
            suas operações no Telegram com o Clona Gram.
          </p>
        </motion.div>

        {/* Carousel - Mobile/Tablet (single card) */}
        <div className="lg:hidden">
          <div className="relative px-4">
            <TestimonialCard
              testimonial={testimonials[activeIndex]}
              isActive={true}
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePrev}
              className="p-3 rounded-full bg-card border border-border hover:border-primary transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>

            {/* Dots */}
            <div className="flex items-center gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsAutoPlaying(false);
                    setActiveIndex(index);
                  }}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all duration-300',
                    index === activeIndex
                      ? 'w-6 bg-primary'
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  )}
                />
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleNext}
              className="p-3 rounded-full bg-card border border-border hover:border-primary transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Grid - Desktop (3 cards) */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="hidden lg:grid grid-cols-3 gap-6"
        >
          {testimonials.slice(0, 3).map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <TestimonialCard testimonial={testimonial} isActive={true} />
            </motion.div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
        >
          {[
            { value: '500+', label: 'Usuários ativos' },
            { value: '1M+', label: 'Mensagens copiadas' },
            { value: '99.9%', label: 'Uptime' },
            { value: '4.9/5', label: 'Avaliação média' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-gradient mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
